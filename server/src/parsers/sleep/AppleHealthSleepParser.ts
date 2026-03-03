import * as fs from 'fs';
import * as readline from 'readline';
import type {
  ISleepEpochData,
  ILunaSleepMetadata,
  ILunaSleepParseResult,
  SleepStageType,
} from './LunaSleepParser';

/**
 * Parsed Apple Health sleep record from export.xml
 */
interface ParsedHealthSleepRecord {
  startTimestamp: number;      // Unix seconds
  endTimestamp: number;        // Unix seconds
  durationSec: number;
  stage: SleepStageType;
  date: string;                // Format: '2024-09-29'
}

/**
 * Apple Health Sleep Parser
 * Parses export.xml and converts to normalized 30-second epochs
 * Output format matches LunaSleepParser interface
 */
export class AppleHealthSleepParser {
  private xmlFilePath: string;
  private readonly EPOCH_SIZE_SEC = 30; // AASM gold standard
  private readonly IST_OFFSET_SEC = 19800; // IST offset: 5 hours 30 minutes

  constructor(xmlFilePath: string) {
    this.xmlFilePath = xmlFilePath;
  }

  /**
   * Main parse method - compatible with Luna parser interface
   * @param filePath - Path to the Apple Health export.xml file
   * @param sessionId - Session ID for reference (string)
   * @param userId - User ID for reference (string)
   * @param sleepDate - Date for which to extract sleep data (optional)
   * @returns Parsed sleep epochs and metadata
   */
  static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    const parser = new AppleHealthSleepParser(filePath);
    
    // Use provided date or current date
    const targetDate = sleepDate || new Date();
    
    try {
      const session = await parser.getSleepSessionForDate(targetDate, userId);
      
      if (!session) {
        console.log(`[AppleHealthSleepParser] No sleep data found for date: ${targetDate}`);
        return {
          epochs: [],
          metadata: {}
        };
      }

      // Convert epochs to database format (with IST offset to match Luna parser format)
      const epochs: ISleepEpochData[] = session.records.map(record => ({
        timestamp: new Date((record.startTimestamp + parser.IST_OFFSET_SEC) * 1000),
        stage: record.stage,
        durationSec: record.durationSec
      }));

      // Calculate metadata
      const stageTotals = {
        AWAKE: 0,
        LIGHT: 0,
        DEEP: 0,
        REM: 0,
      };

      session.records.forEach(record => {
        stageTotals[record.stage] += record.durationSec;
      });

      const totalSleepTimeSec = stageTotals.DEEP + stageTotals.LIGHT + stageTotals.REM;
      const timeInBedSec = session.sessionEndSec - session.sessionStartSec;
      const sleepEfficiency = timeInBedSec > 0 
        ? Math.round((totalSleepTimeSec / timeInBedSec) * 100) 
        : 0;

      const metadata: ILunaSleepMetadata = {
        sleepScore: undefined, // Apple Health doesn't provide a score
        sleepEfficiency,
        totalSleepTimeSec,
        deepSleepSec: stageTotals.DEEP,
        remSleepSec: stageTotals.REM,
        lightSleepSec: stageTotals.LIGHT,
        awakeSec: stageTotals.AWAKE,
        sleepOnsetTime: new Date((session.sessionStartSec + parser.IST_OFFSET_SEC) * 1000),
        finalWakeTime: new Date((session.sessionEndSec + parser.IST_OFFSET_SEC) * 1000),
        timeInBedSec,
      };

      console.log(`[AppleHealthSleepParser] Successfully parsed ${epochs.length} epochs for session ${sessionId}`);
      
      return {
        epochs,
        metadata
      };
    } catch (error) {
      console.error(`[AppleHealthSleepParser] Error parsing sleep data:`, error);
      throw error;
    }
  }

  /**
   * Get sleep data for a specific date (night + morning)
   * Generates 30-second epoch grid
   */
  async getSleepSessionForDate(
    date: Date,
    userId?: string
  ): Promise<{ 
    sessionStartSec: number; 
    sessionEndSec: number; 
    records: ParsedHealthSleepRecord[] 
  } | null> {
    const targetDate = new Date(date);
    const previousNight = new Date(targetDate);
    previousNight.setDate(previousNight.getDate() - 1);

    console.log(`📅 [AppleHealthSleepParser] Fetching sleep data from night of ${this.formatDate(previousNight)} to morning of ${this.formatDate(targetDate)}`);

    const allSleepRecords = await this.parseAllSleepRecords();
    
    if (allSleepRecords.length === 0) {
      console.log(`⚠️  [AppleHealthSleepParser] No sleep records found in export.xml`);
      return null;
    }

    // Deduplicate overlapping records
    const uniqueRecords = this.deduplicateSleepRecords(allSleepRecords);
    console.log(`✅ [AppleHealthSleepParser] Deduplicated: ${allSleepRecords.length} records → ${uniqueRecords.length} unique`);

    const filteredRecords = this.filterByDateRange(uniqueRecords, previousNight, targetDate);
    
    if (filteredRecords.length === 0) {
      console.log('⚠️  [AppleHealthSleepParser] No sleep data found for this date range');
      return null;
    }

    // Group into sessions
    const sessions = this.groupIntoSessions(filteredRecords);
    console.log(`📋 [AppleHealthSleepParser] Found ${sessions.length} sleep sessions in date range`);

    // Select the night sleep
    const nightSession = this.selectNightSleep(sessions, targetDate);
    if (!nightSession || nightSession.length === 0) {
      return null;
    }

    // Generate 30-second epochs from the session
    const sessionStartSec = nightSession[0].startTimestamp;
    const sessionEndSec = nightSession[nightSession.length - 1].endTimestamp;
    const epochs30Sec = this.generate30SecEpochs(sessionStartSec, sessionEndSec, nightSession);

    console.log(`✅ [AppleHealthSleepParser] Generated ${epochs30Sec.length} 30-second epochs`);

    return {
      sessionStartSec,
      sessionEndSec,
      records: epochs30Sec,
    };
  }

  /**
   * Parse all HKCategoryTypeIdentifierSleepAnalysis entries from XML file
   */
  private async parseAllSleepRecords(): Promise<ParsedHealthSleepRecord[]> {
    const records: ParsedHealthSleepRecord[] = [];
    const fileStream = fs.createReadStream(this.xmlFilePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.includes('HKCategoryTypeIdentifierSleepAnalysis')) {
        continue;
      }

      // Skip "InBed" records as they overlap with detailed sleep stages
      if (line.includes('HKCategoryValueSleepAnalysisInBed')) {
        continue;
      }

      try {
        const record = this.parseHealthSleepRecord(line);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        // Silently skip parse errors
      }
    }

    console.log(`📖 [AppleHealthSleepParser] Parsed ${records.length} sleep stage records from export.xml (InBed records filtered)`);
    return records;
  }

  /**
   * Parse a single sleep record from XML line
   * Example: <Record type="HKCategoryTypeIdentifierSleepAnalysis" ... startDate="2024-09-29 02:57:31 +0530" endDate="..." value="HKCategoryValueSleepAnalysisAsleepCore"/>
   */
  private parseHealthSleepRecord(line: string): ParsedHealthSleepRecord | null {
    try {
      const startDateMatch = line.match(/startDate="([^"]+)"/);
      const endDateMatch = line.match(/endDate="([^"]+)"/);
      const valueMatch = line.match(/value="([^"]+)"/);

      if (!startDateMatch || !endDateMatch || !valueMatch) {
        return null;
      }

      const startDateStr = startDateMatch[1];
      const endDateStr = endDateMatch[1];
      const stageValue = valueMatch[1];

      const startTimestamp = this.iso8601ToUnix(startDateStr);
      const endTimestamp = this.iso8601ToUnix(endDateStr);

      if (startTimestamp === 0 || endTimestamp === 0) {
        return null;
      }

      const durationSec = endTimestamp - startTimestamp;
      const stage = this.mapSleepStage(stageValue);
      const date = startDateStr.split(' ')[0]; // Extract YYYY-MM-DD

      return {
        startTimestamp,
        endTimestamp,
        durationSec,
        stage,
        date,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse ISO 8601 timestamp with timezone to unix seconds
   * Format: "2024-09-29 02:57:31 +0530"
   */
  private iso8601ToUnix(dateTimeStr: string): number {
    try {
      const parts = dateTimeStr.split(' ');
      if (parts.length !== 3) return 0;

      const date = parts[0];
      const time = parts[1];
      const tz = parts[2];

      // Convert to ISO 8601 format
      const isoStr = `${date}T${time}${tz.slice(0, 3)}:${tz.slice(3)}`;
      const timestamp = new Date(isoStr).getTime() / 1000;
      return isNaN(timestamp) ? 0 : Math.floor(timestamp);
    } catch {
      return 0;
    }
  }

  /**
   * Generate 30-second epoch grid from variable-duration blocks
   */
  private generate30SecEpochs(
    windowStart: number,
    windowEnd: number,
    blocks: ParsedHealthSleepRecord[]
  ): ParsedHealthSleepRecord[] {
    const epochs: ParsedHealthSleepRecord[] = [];

    for (let t = windowStart; t < windowEnd; t += this.EPOCH_SIZE_SEC) {
      const epochStart = t;
      const epochEnd = Math.min(t + this.EPOCH_SIZE_SEC, windowEnd);

      // Find block with >50% overlap
      let stage: SleepStageType = 'AWAKE';
      for (const block of blocks) {
        const overlapStart = Math.max(epochStart, block.startTimestamp);
        const overlapEnd = Math.min(epochEnd, block.endTimestamp);
        const overlapSec = Math.max(0, overlapEnd - overlapStart);
        const epochDurationSec = epochEnd - epochStart;

        if (overlapSec > epochDurationSec * 0.5) {
          stage = block.stage;
          break;
        }
      }

      const date = new Date(epochStart * 1000);
      epochs.push({
        startTimestamp: epochStart,
        endTimestamp: epochEnd,
        durationSec: epochEnd - epochStart,
        stage,
        date: date.toISOString().split('T')[0],
      });
    }

    return epochs;
  }

  /**
   * Group individual records into continuous sleep sessions
   * A new session starts when there's a gap > 5 minutes
   */
  private groupIntoSessions(records: ParsedHealthSleepRecord[]): ParsedHealthSleepRecord[][] {
    if (records.length === 0) return [];

    const sessions: ParsedHealthSleepRecord[][] = [];
    let currentSession: ParsedHealthSleepRecord[] = [records[0]];

    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      const gap = curr.startTimestamp - prev.endTimestamp;

      // If gap > 5 minutes (300 sec), start new session
      if (gap > 300) {
        sessions.push(currentSession);
        currentSession = [curr];
      } else {
        currentSession.push(curr);
      }
    }

    sessions.push(currentSession);
    return sessions;
  }

  /**
   * Deduplicate overlapping/duplicate records
   */
  private deduplicateSleepRecords(records: ParsedHealthSleepRecord[]): ParsedHealthSleepRecord[] {
    if (records.length === 0) return [];

    const sorted = [...records].sort((a, b) => a.startTimestamp - b.startTimestamp);
    const unique: ParsedHealthSleepRecord[] = [];
    let lastEnd = 0;

    for (const rec of sorted) {
      if (rec.endTimestamp <= lastEnd) continue;
      unique.push(rec);
      lastEnd = rec.endTimestamp;
    }

    return unique;
  }

  /**
   * Filter by date range
   */
  private filterByDateRange(
    records: ParsedHealthSleepRecord[],
    previousNight: Date,
    currentDay: Date
  ): ParsedHealthSleepRecord[] {
    const previousNightStr = this.dateToString(previousNight);
    const currentDayStr = this.dateToString(currentDay);
    const nextDayStr = this.dateToString(new Date(currentDay.getTime() + 86400000));

    return records.filter((record) => {
      return record.date === previousNightStr || 
             record.date === currentDayStr || 
             record.date === nextDayStr;
    });
  }

  /**
   * Select the night sleep session that ends on target date morning
   */
  private selectNightSleep(
    sessions: ParsedHealthSleepRecord[][], 
    targetDate: Date
  ): ParsedHealthSleepRecord[] | null {
    if (sessions.length === 0) return null;
    if (sessions.length === 1) return sessions[0];

    const targetDayStr = this.dateToString(targetDate);

    // Prefer sessions that end on target day
    for (const session of sessions) {
      const endDate = new Date(session[session.length - 1].endTimestamp * 1000);
      const endDateStr = this.dateToString(endDate);

      if (endDateStr === targetDayStr) {
        return session;
      }
    }

    // Fallback: return longest session
    return sessions.reduce((longest, current) => {
      const currentDuration = current[current.length - 1].endTimestamp - current[0].startTimestamp;
      const longestDuration = longest[longest.length - 1].endTimestamp - longest[0].startTimestamp;
      return currentDuration > longestDuration ? current : longest;
    });
  }

  /**
   * Map Apple Sleep value to normalized stage
   */
  private mapSleepStage(appleValue: string): SleepStageType {
    const stageMap: Record<string, SleepStageType> = {
      'HKCategoryValueSleepAnalysisAwake': 'AWAKE',
      'HKCategoryValueSleepAnalysisAsleepCore': 'LIGHT',
      'HKCategoryValueSleepAnalysisAsleepDeep': 'DEEP',
      'HKCategoryValueSleepAnalysisAsleepREM': 'REM',
      'HKCategoryValueSleepAnalysisAsleepUnspecified': 'LIGHT',
      'HKCategoryValueSleepAnalysisInBed': 'LIGHT',
    };
    return stageMap[appleValue] || 'AWAKE';
  }

  /**
   * Convert Date to string format (YYYY-MM-DD)
   */
  private dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format date for display (DD/MM/YYYY)
   */
  private formatDate(date: Date): string {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }
}
