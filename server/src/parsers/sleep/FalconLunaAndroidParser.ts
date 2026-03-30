import { Types } from "mongoose";
import * as fs from 'fs';
import * as readline from 'readline';
import { normalizeTimestampMs } from '../../utils/timestampNormalizer';

/**
 * Sleep stage constants
 */
export const SleepStage = {
  AWAKE: 'AWAKE',
  LIGHT: 'LIGHT',
  DEEP: 'DEEP',
  REM: 'REM',
} as const;

export type SleepStageType = typeof SleepStage[keyof typeof SleepStage];

/**
 * Normalized sleep epoch data for database storage
 */
export interface ISleepEpochData {
  timestamp: Date;
  stage: "AWAKE" | "LIGHT" | "DEEP" | "REM";
  durationSec: number;
}

/**
 * Luna sleep metadata
 */
export interface ILunaSleepMetadata {
  sleepScore?: number;
  sleepEfficiency?: number;
  totalSleepTimeSec?: number;
  deepSleepSec?: number;
  remSleepSec?: number;
  lightSleepSec?: number;
  awakeSec?: number;
  sleepOnsetTime?: Date;
  finalWakeTime?: Date;
  timeInBedSec?: number;
}

/**
 * Luna sleep parse result
 */
export interface ILunaSleepParseResult {
  epochs: ISleepEpochData[];
  metadata: ILunaSleepMetadata;
}

/**
 * Normalized sleep epoch - Gold standard: 30-second epochs
 */
export interface ISleepEpoch30Sec {
  startSec: number;
  endSec: number;
  stage: SleepStageType;
  deviceType: 'luna';
  durationSec: number;
}

/**
 * Sleep block - original variable-duration segment from device
 */
export interface ISleepBlock {
  startSec: number;
  endSec: number;
  stage: SleepStageType;
  deviceType: 'luna';
  durationSec: number;
}

/**
 * Complete sleep session
 */
export interface ISleepSession {
  metadata: {
    source: 'falcon-luna-android';
    deviceId?: string;
    userId?: string;
    recordedAt: string;
  };
  sessionStartSec: number;
  sessionEndSec: number;
  sessionDurationSec: number;
  windowRange: {
    startIST: string;
    endIST: string;
  };
  blocks: ISleepBlock[];
  epochs30Sec: ISleepEpoch30Sec[];
  stageSummary: {
    [key in SleepStageType]: {
      count: number;
      totalSec: number;
    };
  };
}

/**
 * Internal parsed sleep result structure
 */
interface ParsedRingSleepResult {
  isExistSleep: boolean;
  entryTime: number;
  exitTime: number;
  sleepDuration: number;
  timeInBedTime: number;
  sleepLatency: number;
  sleepEfficiency: number;
  sleepScore: number;
  awakeTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  rapidEyeMovementTime: number;
  sleepDistributionData: SleepDistributionData[];
  date: string;
}

/**
 * Internal parsed sleep distribution structure
 */
interface SleepDistributionData {
  startTimestamp: number;
  sleepDuration: number;
  sleepDistributionType: number;
}

/**
 * Falcon Luna Android App Log Parser
 * Parses sleep data from Falcon Luna Ring app logs (Android)
 * Extracts onRingSleepResult entries and converts to normalized 30-second epochs
 */
export class FalconLunaAndroidParser {
  private logFilePath: string;
  private readonly EPOCH_SIZE_SEC = 30;
  private readonly IST_OFFSET_SEC = 19800; // 5 hours 30 minutes

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  /**
   * Main parse method - compatible with existing interface
   * @param filePath - Path to the Falcon Luna app log file
   * @param sessionId - Session ID for reference
   * @param userId - User ID for reference
   * @param sleepDate - Date for which to extract sleep data (optional)
   * @returns Parsed sleep epochs and metadata
   */
  static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    const parser = new FalconLunaAndroidParser(filePath);
    
    const targetDate = sleepDate || new Date();
    
    try {
      const session = await parser.getSleepSessionForDate(targetDate, userId.toString());
      
      if (!session) {
        console.log(`[FalconLunaAndroidParser] No sleep data found for date: ${targetDate}`);
        return {
          epochs: [],
          metadata: {}
        };
      }

      // Convert epochs to database format
      const epochs: ISleepEpochData[] = session.epochs30Sec.map(epoch => {
        const rawTimestampMs = (epoch.startSec + parser.IST_OFFSET_SEC) * 1000;
        const normalizedTimestampMs = normalizeTimestampMs(rawTimestampMs);
        return {
          timestamp: new Date(normalizedTimestampMs),
          stage: epoch.stage,
          durationSec: epoch.durationSec
        };
      });

      // Build metadata
      const metadata: ILunaSleepMetadata = {
        totalSleepTimeSec: session.stageSummary.DEEP.totalSec + 
                          session.stageSummary.LIGHT.totalSec + 
                          session.stageSummary.REM.totalSec,
        deepSleepSec: session.stageSummary.DEEP.totalSec,
        remSleepSec: session.stageSummary.REM.totalSec,
        lightSleepSec: session.stageSummary.LIGHT.totalSec,
        awakeSec: session.stageSummary.AWAKE.totalSec,
        sleepOnsetTime: new Date((session.sessionStartSec + parser.IST_OFFSET_SEC) * 1000),
        finalWakeTime: new Date((session.sessionEndSec + parser.IST_OFFSET_SEC) * 1000),
        timeInBedSec: session.sessionDurationSec
      };

      console.log(`[FalconLunaAndroidParser] Successfully parsed ${epochs.length} epochs for session ${sessionId}`);
      
      return {
        epochs,
        metadata
      };
    } catch (error) {
      console.error(`[FalconLunaAndroidParser] Error parsing sleep data:`, error);
      throw error;
    }
  }

  /**
   * Get sleep data for a specific date (night + morning)
   */
  async getSleepSessionForDate(date: string | Date, userId?: string): Promise<ISleepSession | null> {
    const targetDate = this.parseDate(date);
    const previousNight = new Date(targetDate);
    previousNight.setDate(previousNight.getDate() - 1);

    console.log(`📅 [Falcon] Fetching sleep data from night of ${this.formatDate(previousNight)} to morning of ${this.formatDate(targetDate)}`);

    const allSleepRecords = await this.parseAllSleepRecords();
    
    const uniqueRecords = this.deduplicateSleepRecords(allSleepRecords);
    console.log(`✅ [Falcon] Deduplicated: ${allSleepRecords.length} records → ${uniqueRecords.length} unique sessions\n`);

    const filteredRecords = this.filterByDateRange(uniqueRecords, previousNight, targetDate);
    
    if (filteredRecords.length === 0) {
      console.log('⚠️  [Falcon] No sleep data found for this date range');
      return null;
    }

    const nightSleep = this.selectNightSleep(filteredRecords, targetDate);
    if (!nightSleep) return null;

    const selectedDurationHours = ((nightSleep.exitTime - nightSleep.entryTime) / 3600).toFixed(2);
    console.log(`✅ [Falcon] Selected session [${selectedDurationHours}h]\n`);
    return this.buildSleepSession(nightSleep, userId);
  }

  /**
   * Parse all onRingSleepResult entries from the app log file
   */
  private async parseAllSleepRecords(): Promise<ParsedRingSleepResult[]> {
    const records: ParsedRingSleepResult[] = [];
    const fileStream = fs.createReadStream(this.logFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      // Look for onRingSleepResult lines in the app log
      if (!line.includes('onRingSleepResult') || !line.includes('RingSleepResultBean')) {
        continue;
      }

      try {
        const record = this.extractRingSleepResultBean(line);
        if (record && record.isExistSleep) {
          records.push(record);
        }
      } catch (error) {
        // Silently skip parse errors
      }
    }

    console.log(`📖 [Falcon] Parsed ${records.length} total sleep records from app log`);
    return records;
  }

  /**
   * Extract RingSleepResultBean from an app log line
   * Format: "2026-03-20 09:49:35.263 I/X-LOG: LUNA-> onRingSleepResult : RingSleepResultBean{...}"
   */
  private extractRingSleepResultBean(line: string): ParsedRingSleepResult | null {
    try {
      const beanStart = line.indexOf('RingSleepResultBean{');
      const beanEnd = line.lastIndexOf('}');
      if (beanStart === -1 || beanEnd === -1) return null;

      const beanContent = line.substring(beanStart + 'RingSleepResultBean{'.length, beanEnd);

      const isExistSleep = this.extractBoolean(beanContent, 'isExistSleep');
      const entryTime = this.extractNumber(beanContent, 'entryTime');
      const exitTime = this.extractNumber(beanContent, 'exitTime');
      const sleepDuration = this.extractNumber(beanContent, 'sleepDuration');
      const timeInBedTime = this.extractNumber(beanContent, 'timeInBedTime');
      const sleepLatency = this.extractNumber(beanContent, 'sleepLatency');
      const sleepEfficiency = this.extractNumber(beanContent, 'sleepEfficiency');
      const sleepScore = this.extractNumber(beanContent, 'sleepScore');
      const awakeTime = this.extractNumber(beanContent, 'awakeTime');
      const lightSleepTime = this.extractNumber(beanContent, 'lightSleepTime');
      const deepSleepTime = this.extractNumber(beanContent, 'deepSleepTime');
      const rapidEyeMovementTime = this.extractNumber(beanContent, 'rapidEyeMovementTime');
      const date = this.extractString(beanContent, "date='", "'");
      const sleepDistributionData = this.extractSleepDistributionArray(beanContent);

      return {
        isExistSleep,
        entryTime,
        exitTime,
        sleepDuration,
        timeInBedTime,
        sleepLatency,
        sleepEfficiency,
        sleepScore,
        awakeTime,
        lightSleepTime,
        deepSleepTime,
        rapidEyeMovementTime,
        sleepDistributionData,
        date,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract sleep distribution array from bean content
   */
  private extractSleepDistributionArray(content: string): SleepDistributionData[] {
    const distributions: SleepDistributionData[] = [];
    const arrayStart = content.indexOf('sleepDistributionData=[');
    if (arrayStart === -1) return distributions;

    const arrayEnd = content.indexOf('], sleepMovementsData=[', arrayStart);
    const arrayContent = content.substring(arrayStart + 'sleepDistributionData=['.length, arrayEnd);

    const pattern = /SleepDistribution\{[^}]+\}/g;
    const matches = arrayContent.match(pattern);

    if (!matches) return distributions;

    for (const match of matches) {
      const startTimestamp = this.extractNumber(match, 'startTimestamp');
      const sleepDuration = this.extractNumber(match, 'sleepDuration');
      const sleepDistributionType = this.extractNumber(match, 'sleepDistributionType');

      distributions.push({
        startTimestamp,
        sleepDuration,
        sleepDistributionType,
      });
    }

    return distributions;
  }

  /**
   * Deduplicate by entryTime - keep FIRST occurrence only
   */
  private deduplicateSleepRecords(records: ParsedRingSleepResult[]): ParsedRingSleepResult[] {
    const seen = new Set<number>();
    const unique: ParsedRingSleepResult[] = [];

    for (const record of records) {
      if (!seen.has(record.entryTime)) {
        seen.add(record.entryTime);
        unique.push(record);
      }
    }

    return unique;
  }

  /**
   * Filter by date range
   */
  private filterByDateRange(
    records: ParsedRingSleepResult[],
    previousNight: Date,
    currentDay: Date
  ): ParsedRingSleepResult[] {
    const previousNightStr = this.dateToString(previousNight);
    const currentDayStr = this.dateToString(currentDay);
    
    const nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = this.dateToString(nextDay);

    return records.filter((record) => {
      const recordDate = record.date.split(' ')[0];
      return recordDate === previousNightStr || recordDate === currentDayStr || recordDate === nextDayStr;
    });
  }

  /**
   * Build complete sleep session with 30-sec epochs
   */
  private buildSleepSession(record: ParsedRingSleepResult, userId?: string): ISleepSession {
    const sessionStartSec = record.entryTime;
    const sessionEndSec = record.exitTime;
    const sessionDurationSec = sessionEndSec - sessionStartSec;

    const blocks: ISleepBlock[] = record.sleepDistributionData.map((dist) => ({
      startSec: dist.startTimestamp,
      endSec: dist.startTimestamp + dist.sleepDuration,
      stage: this.mapSleepStage(dist.sleepDistributionType),
      deviceType: 'luna' as const,
      durationSec: dist.sleepDuration,
    }));

    const epochs30Sec = this.generate30SecEpochs(sessionStartSec, sessionEndSec, blocks);
    const stageSummary = this.computeStageSummary(epochs30Sec);

    return {
      metadata: {
        source: 'falcon-luna-android',
        userId: userId || 'unknown',
        recordedAt: new Date().toISOString(),
      },
      sessionStartSec,
      sessionEndSec,
      sessionDurationSec,
      windowRange: {
        startIST: this.unixToIST(sessionStartSec),
        endIST: this.unixToIST(sessionEndSec),
      },
      blocks,
      epochs30Sec,
      stageSummary,
    };
  }

  /**
   * Select the night sleep from multiple sessions
   */
  private selectNightSleep(records: ParsedRingSleepResult[], targetDate: Date): ParsedRingSleepResult | null {
    if (records.length === 0) return null;
    if (records.length === 1) return records[0];

    const targetDayStr = this.dateToString(targetDate);

    for (const rec of records) {
      const endDate = new Date(rec.exitTime * 1000);
      const endDateStr = this.dateToString(endDate);
      
      if (endDateStr === targetDayStr) {
        return rec;
      }
    }

    return records.reduce((longest, current) => {
      const currentDuration = current.exitTime - current.entryTime;
      const longestDuration = longest.exitTime - longest.entryTime;
      return currentDuration > longestDuration ? current : longest;
    });
  }

  /**
   * Generate 30-second epoch grid
   */
  private generate30SecEpochs(windowStart: number, windowEnd: number, blocks: ISleepBlock[]): ISleepEpoch30Sec[] {
    const epochs: ISleepEpoch30Sec[] = [];

    for (let t = windowStart; t < windowEnd; t += this.EPOCH_SIZE_SEC) {
      const epochStart = t;
      const epochEnd = Math.min(t + this.EPOCH_SIZE_SEC, windowEnd);

      let stage: SleepStageType = SleepStage.AWAKE;
      for (const block of blocks) {
        const overlapStart = Math.max(epochStart, block.startSec);
        const overlapEnd = Math.min(epochEnd, block.endSec);
        const overlapSec = Math.max(0, overlapEnd - overlapStart);
        const epochDurationSec = epochEnd - epochStart;

        if (overlapSec > epochDurationSec * 0.5) {
          stage = block.stage;
          break;
        }
      }

      epochs.push({
        startSec: epochStart,
        endSec: epochEnd,
        stage,
        deviceType: 'luna',
        durationSec: epochEnd - epochStart,
      });
    }

    return epochs;
  }

  /**
   * Compute stage summary from epochs
   */
  private computeStageSummary(epochs: ISleepEpoch30Sec[]): ISleepSession['stageSummary'] {
    const summary: ISleepSession['stageSummary'] = {
      AWAKE: { count: 0, totalSec: 0 },
      LIGHT: { count: 0, totalSec: 0 },
      DEEP: { count: 0, totalSec: 0 },
      REM: { count: 0, totalSec: 0 },
    };

    for (const epoch of epochs) {
      summary[epoch.stage].count++;
      summary[epoch.stage].totalSec += epoch.durationSec;
    }

    return summary;
  }

  /**
   * Map sleep distribution type to stage
   * 0 = AWAKE, 1 = LIGHT, 2 = DEEP, 3 = REM
   */
  private mapSleepStage(type: number): SleepStageType {
    switch (type) {
      case 0: return SleepStage.AWAKE;
      case 1: return SleepStage.LIGHT;
      case 2: return SleepStage.DEEP;
      case 3: return SleepStage.REM;
      default: return SleepStage.AWAKE;
    }
  }

  // Helper methods
  private extractBoolean(content: string, key: string): boolean {
    const pattern = new RegExp(`${key}=(true|false)`);
    const match = content.match(pattern);
    return match ? match[1] === 'true' : false;
  }

  private extractNumber(content: string, key: string): number {
    const pattern = new RegExp(`${key}=(\\d+)`);
    const match = content.match(pattern);
    return match ? parseInt(match[1]) : 0;
  }

  private extractString(content: string, startDelim: string, endDelim: string): string {
    const start = content.indexOf(startDelim);
    if (start === -1) return '';
    const valueStart = start + startDelim.length;
    const end = content.indexOf(endDelim, valueStart);
    return end === -1 ? '' : content.substring(valueStart, end);
  }

  private parseDate(date: string | Date): Date {
    if (date instanceof Date) return date;
    const parts = date.split('/');
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(date);
  }

  private formatDate(date: Date): string {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private unixToIST(unixSec: number): string {
    const date = new Date((unixSec + this.IST_OFFSET_SEC) * 1000);
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
}
