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
 * startSec and endSec are Unix timestamps in seconds
 */
export interface ISleepEpoch30Sec {
  startSec: number;    // Unix seconds
  endSec: number;      // Unix seconds (startSec + 30)
  stage: SleepStageType;
  deviceType: 'luna';
  durationSec: number; // Always 30 for regular epochs
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
    source: 'luna';
    deviceId?: string;
    userId?: string;
    recordedAt: string; // ISO string
  };
  sessionStartSec: number;      // Unix seconds - when sleep started
  sessionEndSec: number;        // Unix seconds - when sleep ended
  sessionDurationSec: number;   // Total sleep duration
  windowRange: {
    startIST: string;  // IST formatted start time
    endIST: string;    // IST formatted end time
  };
  blocks: ISleepBlock[];        // Original variable-duration blocks
  epochs30Sec: ISleepEpoch30Sec[]; // Generated 30-sec grid
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
  date: string; // Format: '2026-02-26 07:08:57'
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
 * Luna Sleep Log Parser
 * Parses Luna Band sleep data and converts to normalized 30-second epochs
 */
export class LunaSleepParser {
  private logFilePath: string;
  private readonly EPOCH_SIZE_SEC = 30; // AASM gold standard
  private readonly IST_OFFSET_SEC = 19800; // IST offset: 5 hours 30 minutes

  constructor(logFilePath: string) {
    this.logFilePath = logFilePath;
  }

  /**
   * Main parse method - compatible with existing interface
   * @param filePath - Path to the Luna sleep log file
   * @param sessionId - Session ID for reference
   * @param userId - User ID for reference
   * @param sleepDate - Date for which to extract sleep data (optional, will use current date if not provided)
   * @returns Parsed sleep epochs and metadata
   */
  static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    const parser = new LunaSleepParser(filePath);
    
    // Use provided date or current date
    const targetDate = sleepDate || new Date();
    
    try {
      const session = await parser.getSleepSessionForDate(targetDate, userId.toString());
      
      if (!session) {
        console.log(`[LunaSleepParser] No sleep data found for date: ${targetDate}`);
        return {
          epochs: [],
          metadata: {}
        };
      }

      // Convert epochs to database format (with IST offset and timestamp normalization)
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
        sleepScore: undefined, // Will be extracted if available
        sleepEfficiency: undefined,
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

      console.log(`[LunaSleepParser] Successfully parsed ${epochs.length} epochs for session ${sessionId}`);
      
      return {
        epochs,
        metadata
      };
    } catch (error) {
      console.error(`[LunaSleepParser] Error parsing sleep data:`, error);
      throw error;
    }
  }

  /**
   * Get sleep data for a specific date (night + morning)
   * Deduplicates records and generates 30-second epoch grid
   *
   * @param date - Target date (DD/MM/YYYY format or Date object)
   * @param userId - Optional user ID
   * @returns Complete sleep session with 30-sec epochs
   */
  async getSleepSessionForDate(date: string | Date, userId?: string): Promise<ISleepSession | null> {
    const targetDate = this.parseDate(date);
    const previousNight = new Date(targetDate);
    previousNight.setDate(previousNight.getDate() - 1);

    console.log(`📅 Fetching sleep data from night of ${this.formatDate(previousNight)} to morning of ${this.formatDate(targetDate)}`);

    const allSleepRecords = await this.parseAllSleepRecords();
    
    // Deduplicate by entryTime - keep only FIRST occurrence
    const uniqueRecords = this.deduplicateSleepRecords(allSleepRecords);
    console.log(`✅ Deduplicated: ${allSleepRecords.length} records → ${uniqueRecords.length} unique sessions\n`);

    const filteredRecords = this.filterByDateRange(uniqueRecords, previousNight, targetDate);
    
    if (filteredRecords.length === 0) {
      console.log('⚠️  No sleep data found for this date range');
      return null;
    }

    // Select the longest sleep (night sleep, not a nap)
    const nightSleep = this.selectNightSleep(filteredRecords, targetDate);
    if (!nightSleep) return null;

    const selectedDurationHours = ((nightSleep.exitTime - nightSleep.entryTime) / 3600).toFixed(2);
    console.log(`✅ Selected session [${selectedDurationHours}h]\n`);
    return this.buildSleepSession(nightSleep, userId);
  }

  /**
   * Parse all RingSleepResultBean entries from the log file
   */
  private async parseAllSleepRecords(): Promise<ParsedRingSleepResult[]> {
    const records: ParsedRingSleepResult[] = [];
    const fileStream = fs.createReadStream(this.logFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.includes('parsingFitness ringSleepResultData = RingSleepResultBean')) {
        continue;
      }

      try {
        const record = this.extractRingSleepResultBean(line);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        // Silently skip parse errors
      }
    }

    console.log(`📖 Parsed ${records.length} total sleep records from log file`);
    return records;
  }

  /**
   * Extract RingSleepResultBean from a log line
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
   * Extract sleep distribution array
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
   * Filter by date range - includes sessions that span or bridge the date range
   * For "26th night to 27th morning" request (targeting 27/02):
   *   - Include sessions logged on 26/02 (tail of 25->26 night)
   *   - Include sessions logged on 27/02 (actually the 26->27 night in IST time)
   *   - Include sessions logged on 28/02 (catches edge cases)
   */
  private filterByDateRange(
    records: ParsedRingSleepResult[],
    previousNight: Date,
    currentDay: Date
  ): ParsedRingSleepResult[] {
    const previousNightStr = this.dateToString(previousNight);
    const currentDayStr = this.dateToString(currentDay);
    
    // Also check the day AFTER currentDay to catch sessions that span midnight
    const nextDay = new Date(currentDay);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = this.dateToString(nextDay);

    return records.filter((record) => {
      const recordDate = record.date.split(' ')[0];
      // Include sessions from: previous night, current day, OR next day
      // This captures sessions that may be logged on the "next" calendar day
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

    // Build sleep blocks (original variable-duration segments)
    const blocks: ISleepBlock[] = record.sleepDistributionData.map((dist) => ({
      startSec: dist.startTimestamp,
      endSec: dist.startTimestamp + dist.sleepDuration,
      stage: this.mapSleepStage(dist.sleepDistributionType),
      deviceType: 'luna' as const,
      durationSec: dist.sleepDuration,
    }));

    // Generate 30-second epoch grid
    const epochs30Sec = this.generate30SecEpochs(sessionStartSec, sessionEndSec, blocks);

    // Compute stage summary from 30-sec epochs
    const stageSummary = this.computeStageSummary(epochs30Sec);

    return {
      metadata: {
        source: 'luna',
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
   * Select the night sleep from multiple sessions in the date range
   * For a request like "27/02/2026", we want the sleep that:
   * - Starts on the EVENING of 26/02
   * - Ends on the MORNING of 27/02
   * 
   * This is the session that bridges the two days (not earlier sessions)
   */
  private selectNightSleep(records: ParsedRingSleepResult[], targetDate: Date): ParsedRingSleepResult | null {
    if (records.length === 0) return null;
    if (records.length === 1) return records[0];

    // For "26th night to 27th morning", we want the session closest to the target date
    // Filter for sessions that end ON or near the target date in the morning
    const targetDayStr = this.dateToString(targetDate);

    // Prefer sessions that end on the target day (morning of target date)
    for (const rec of records) {
      const endDate = new Date(rec.exitTime * 1000);
      const endDateStr = this.dateToString(endDate);
      
      if (endDateStr === targetDayStr) {
        return rec;
      }
    }

    // Fallback: return longest session
    return records.reduce((longest, current) => {
      const currentDuration = current.exitTime - current.entryTime;
      const longestDuration = longest.exitTime - longest.entryTime;
      return currentDuration > longestDuration ? current : longest;
    });
  }

  /**
   * Generate 30-second epoch grid
   * Each epoch is assigned the stage of the block that covers it (>50% overlap)
   */
  private generate30SecEpochs(windowStart: number, windowEnd: number, blocks: ISleepBlock[]): ISleepEpoch30Sec[] {
    const epochs: ISleepEpoch30Sec[] = [];

    for (let t = windowStart; t < windowEnd; t += this.EPOCH_SIZE_SEC) {
      const epochStart = t;
      const epochEnd = Math.min(t + this.EPOCH_SIZE_SEC, windowEnd);

      // Find block with >50% overlap
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
  private computeStageSummary(epochs: ISleepEpoch30Sec[]): Record<SleepStageType, { count: number; totalSec: number }> {
    const summary: Record<SleepStageType, { count: number; totalSec: number }> = {
      [SleepStage.AWAKE]: { count: 0, totalSec: 0 },
      [SleepStage.LIGHT]: { count: 0, totalSec: 0 },
      [SleepStage.DEEP]: { count: 0, totalSec: 0 },
      [SleepStage.REM]: { count: 0, totalSec: 0 },
    };

    for (const epoch of epochs) {
      summary[epoch.stage].count += 1;
      summary[epoch.stage].totalSec += epoch.durationSec;
    }

    return summary;
  }

  /**
   * Map Luna sleep type to stage
   */
  private mapSleepStage(distributionType: number): SleepStageType {
    const stageMap: Record<number, SleepStageType> = {
      0: SleepStage.AWAKE,
      1: SleepStage.LIGHT,
      2: SleepStage.DEEP,
      3: SleepStage.REM,
    };
    return stageMap[distributionType] || SleepStage.AWAKE;
  }

  /**
   * Unix timestamp to local timezone formatted string (DD/MM/YYYY HH:MM:SS format)
   * Uses system's local timezone
   */
  unixToIST(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Validate Luna sleep data format
   */
  static validateFormat(data: any): boolean {
    // Basic validation - check if file has RingSleepResultBean entries
    if (typeof data === 'string') {
      return data.includes('RingSleepResultBean');
    }
    return false;
  }

  private extractNumber(content: string, fieldName: string): number {
    const regex = new RegExp(`${fieldName}=([0-9]+)`);
    const match = content.match(regex);
    return match ? parseInt(match[1], 10) : 0;
  }

  private extractBoolean(content: string, fieldName: string): boolean {
    const regex = new RegExp(`${fieldName}=(true|false)`);
    const match = content.match(regex);
    return match ? match[1] === 'true' : false;
  }

  private extractString(content: string, startDelim: string, endDelim: string): string {
    const start = content.indexOf(startDelim);
    if (start === -1) return '';
    const end = content.indexOf(endDelim, start + startDelim.length);
    if (end === -1) return '';
    return content.substring(start + startDelim.length, end);
  }

  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  private parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
      return new Date(dateInput);
    }

    const parts = dateInput.split(/[\/-]/);
    if (parts.length !== 3) {
      throw new Error(`Invalid date format: ${dateInput}`);
    }

    let year, month, day;

    if (parts[0].length === 4) {
      [year, month, day] = [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
    } else if (parts[2].length === 4) {
      [day, month, year] = [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)];
    } else {
      throw new Error(`Cannot determine date format: ${dateInput}`);
    }

    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateInput}`);
    }
    return date;
  }
}
