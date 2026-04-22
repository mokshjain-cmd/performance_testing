import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import type {
  ISleepEpochData,
  ILunaSleepMetadata,
  ILunaSleepParseResult,
} from './LunaSleepParser';

/**
 * Whoop Sleep CSV Record
 */
interface WhoopSleepRecord {
  cycleStartTime: string;
  cycleEndTime: string;
  cycleTimezone: string;
  sleepOnset: string;
  wakeOnset: string;
  sleepPerformance: number;
  respiratoryRate: number;
  asleepDurationMin: number;
  inBedDurationMin: number;
  lightSleepMin: number;
  deepSleepMin: number;
  remSleepMin: number;
  awakeDurationMin: number;
  sleepNeed: number;
  sleepDebt: number;
  sleepEfficiency: number;
  sleepConsistency: number;
  isNap: boolean;
}

/**
 * Whoop Sleep Parser
 * Parses Whoop sleeps.csv and converts to summary metrics
 * NOTE: Whoop does NOT provide epoch-level stage timing, only duration totals
 * Output format matches LunaSleepParser interface with EMPTY epochs array
 */
export class WhoopSleepParser {
  /**
   * Main parse method - compatible with Luna parser interface
   * @param filePath - Path to Whoop ZIP file or extracted folder
   * @param sessionId - Session ID for reference (string)
   * @param userId - User ID for reference (string)
   * @param sleepDate - Date for which to extract sleep data (wake time)
   * @returns Parsed sleep metadata with EMPTY epochs array
   */
  static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    console.log('\n🟣 ========================================');
    console.log('🟣 [WhoopSleepParser] Starting Whoop CSV parsing');
    console.log('🟣 ========================================');
    console.log(`📂 File path: ${filePath}`);
    console.log(`📅 Target sleep date: ${sleepDate ? sleepDate.toISOString() : 'Not specified'}`);

    try {
      // Find sleeps.csv in the provided path (folder or direct file)
      const sleepsCsvPath = await this.findSleepsCsv(filePath);
      
      if (!sleepsCsvPath) {
        console.log('❌ [WhoopSleepParser] sleeps.csv not found');
        return {
          epochs: [],
          metadata: {}
        };
      }

      console.log(`✅ [WhoopSleepParser] Found sleeps.csv: ${sleepsCsvPath}`);

      // Parse CSV and get all sleep records
      const allRecords = await this.parseSleepsCsv(sleepsCsvPath);
      console.log(`📋 [WhoopSleepParser] Parsed ${allRecords.length} total sleep records`);

      if (allRecords.length === 0) {
        console.log('⚠️  [WhoopSleepParser] No sleep records found in CSV');
        return {
          epochs: [],
          metadata: {}
        };
      }

      // Filter out naps
      const mainSleeps = allRecords.filter(record => !record.isNap);
      console.log(`🛏️  [WhoopSleepParser] Filtered to ${mainSleeps.length} main sleep sessions (naps excluded)`);

      // Find matching sleep record by date
      const targetDate = sleepDate || new Date();
      const matchingRecord = this.findMatchingSleepRecord(mainSleeps, targetDate);

      if (!matchingRecord) {
        console.log(`❌ [WhoopSleepParser] No sleep found ending on ${targetDate.toISOString().split('T')[0]}`);
        return {
          epochs: [],
          metadata: {}
        };
      }

      console.log(`✅ [WhoopSleepParser] Found matching sleep session:`);
      console.log(`   Sleep onset: ${matchingRecord.sleepOnset}`);
      console.log(`   Wake onset: ${matchingRecord.wakeOnset}`);
      console.log(`   Total sleep: ${matchingRecord.asleepDurationMin} min`);

      // Build metadata from Whoop record
      const metadata = this.buildMetadata(matchingRecord);

      console.log('🟣 [WhoopSleepParser] ⚠️  NO EPOCHS GENERATED (Whoop only provides summary metrics)');
      console.log('🟣 ========================================\n');

      return {
        epochs: [], // Whoop does not provide epoch-level data
        metadata
      };

    } catch (error) {
      console.error(`❌ [WhoopSleepParser] Error parsing Whoop sleep data:`, error);
      throw error;
    }
  }

  /**
   * Find sleeps.csv in the provided path
   * Path could be: direct file, extracted folder, or folder containing subfolder
   */
  private static async findSleepsCsv(filePath: string): Promise<string | null> {
    try {
      const stat = fs.statSync(filePath);

      // If it's a file and named sleeps.csv, return it
      if (stat.isFile() && path.basename(filePath) === 'sleeps.csv') {
        return filePath;
      }

      // If it's a directory, search for sleeps.csv
      if (stat.isDirectory()) {
        return this.findFileRecursive(filePath, 'sleeps.csv');
      }

      return null;
    } catch (error) {
      console.error(`❌ [WhoopSleepParser] Error finding sleeps.csv:`, error);
      return null;
    }
  }

  /**
   * Recursively search for a file in directory
   */
  private static findFileRecursive(dirPath: string, fileName: string): string | null {
    try {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          const found = this.findFileRecursive(fullPath, fileName);
          if (found) return found;
        } else if (file === fileName) {
          return fullPath;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse sleeps.csv and extract all records
   */
  private static async parseSleepsCsv(csvPath: string): Promise<WhoopSleepRecord[]> {
    const records: WhoopSleepRecord[] = [];
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let isFirstLine = true;
    let headers: string[] = [];

    for await (const line of rl) {
      if (isFirstLine) {
        // Parse CSV header
        headers = this.parseCsvLine(line);
        isFirstLine = false;
        continue;
      }

      try {
        const record = this.parseSleepRecord(line, headers);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        // Skip invalid records
        console.warn(`⚠️  [WhoopSleepParser] Skipping invalid CSV line`);
      }
    }

    return records;
  }

  /**
   * Parse CSV line handling quoted fields
   */
  private static parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    fields.push(currentField.trim());
    return fields;
  }

  /**
   * Parse a single sleep record from CSV line
   */
  private static parseSleepRecord(line: string, headers: string[]): WhoopSleepRecord | null {
    try {
      const values = this.parseCsvLine(line);

      if (values.length < headers.length) {
        return null;
      }

      // Create map of header -> value
      const recordMap: Record<string, string> = {};
      headers.forEach((header, index) => {
        recordMap[header] = values[index];
      });

      // Extract and parse required fields
      const sleepOnset = recordMap['Sleep onset'];
      const wakeOnset = recordMap['Wake onset'];

      // Skip if essential fields are missing
      if (!sleepOnset || !wakeOnset) {
        return null;
      }

      return {
        cycleStartTime: recordMap['Cycle start time'] || '',
        cycleEndTime: recordMap['Cycle end time'] || '',
        cycleTimezone: recordMap['Cycle timezone'] || 'UTC',
        sleepOnset,
        wakeOnset,
        sleepPerformance: this.parseFloat(recordMap['Sleep performance %']),
        respiratoryRate: this.parseFloat(recordMap['Respiratory rate (rpm)']),
        asleepDurationMin: this.parseFloat(recordMap['Asleep duration (min)']),
        inBedDurationMin: this.parseFloat(recordMap['In bed duration (min)']),
        lightSleepMin: this.parseFloat(recordMap['Light sleep duration (min)']),
        deepSleepMin: this.parseFloat(recordMap['Deep (SWS) duration (min)']),
        remSleepMin: this.parseFloat(recordMap['REM duration (min)']),
        awakeDurationMin: this.parseFloat(recordMap['Awake duration (min)']),
        sleepNeed: this.parseFloat(recordMap['Sleep need (min)']),
        sleepDebt: this.parseFloat(recordMap['Sleep debt (min)']),
        sleepEfficiency: this.parseFloat(recordMap['Sleep efficiency %']),
        sleepConsistency: this.parseFloat(recordMap['Sleep consistency %']),
        isNap: recordMap['Nap'] === 'true',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse float from string, return 0 if invalid
   */
  private static parseFloat(value: string): number {
    if (!value || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Find sleep record matching target date (by wake onset)
   * If multiple matches, return the one with longest sleep duration
   */
  private static findMatchingSleepRecord(
    records: WhoopSleepRecord[],
    targetDate: Date
  ): WhoopSleepRecord | null {
    const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Filter records where wake onset matches target date
    const matchingRecords = records.filter(record => {
      const wakeDate = this.parseWhoopTimestamp(record.wakeOnset, record.cycleTimezone);
      if (!wakeDate) return false;
      
      const wakeDateStr = wakeDate.toISOString().split('T')[0];
      return wakeDateStr === targetDateStr;
    });

    if (matchingRecords.length === 0) {
      return null;
    }

    if (matchingRecords.length === 1) {
      return matchingRecords[0];
    }

    // Multiple matches - return longest sleep
    console.log(`⚠️  [WhoopSleepParser] Multiple sleeps found for ${targetDateStr}, selecting longest`);
    return matchingRecords.reduce((longest, current) => 
      current.asleepDurationMin > longest.asleepDurationMin ? current : longest
    );
  }

  /**
   * Parse Whoop timestamp format: "2026-04-15 01:01:10"
   * Apply timezone offset from Cycle timezone column
   */
  private static parseWhoopTimestamp(timestampStr: string, timezoneStr: string): Date | null {
    try {
      if (!timestampStr || timestampStr === '') return null;

      // Parse timezone offset (e.g., "UTC+08:00" -> +08:00)
      let timezoneOffset = '+00:00';
      if (timezoneStr && timezoneStr.includes('UTC')) {
        const offsetMatch = timezoneStr.match(/UTC([+-]\d{2}:\d{2})/);
        if (offsetMatch) {
          timezoneOffset = offsetMatch[1];
        }
      }

      // Convert to ISO format: "2026-04-15T01:01:10+08:00"
      const isoString = `${timestampStr.replace(' ', 'T')}${timezoneOffset}`;
      const date = new Date(isoString);

      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Build metadata from Whoop sleep record
   * Convert minutes to seconds and construct ILunaSleepMetadata
   */
  private static buildMetadata(record: WhoopSleepRecord): ILunaSleepMetadata {
    const sleepOnsetTime = this.parseWhoopTimestamp(record.sleepOnset, record.cycleTimezone);
    const finalWakeTime = this.parseWhoopTimestamp(record.wakeOnset, record.cycleTimezone);

    return {
      sleepScore: record.sleepPerformance > 0 ? record.sleepPerformance : undefined,
      sleepEfficiency: record.sleepEfficiency > 0 ? record.sleepEfficiency : undefined,
      totalSleepTimeSec: record.asleepDurationMin * 60,
      deepSleepSec: record.deepSleepMin * 60,
      remSleepSec: record.remSleepMin * 60,
      lightSleepSec: record.lightSleepMin * 60,
      awakeSec: record.awakeDurationMin * 60,
      sleepOnsetTime: sleepOnsetTime || undefined,
      finalWakeTime: finalWakeTime || undefined,
      timeInBedSec: record.inBedDurationMin * 60,
    };
  }
}
