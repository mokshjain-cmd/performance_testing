/**
 * Luna iOS SPO2 Parser
 * Parses Luna device SPO2 data from iOS ZHDRingsLogs.txt format
 * Extracts continuous blood oxygen data with 15-minute intervals
 */

import fs from 'fs/promises';

interface NormalizedReadingInput {
  meta: {
    sessionId: any;
    userId: any;
    deviceType: string;
    activityType: string;
    bandPosition?: string;
    firmwareVersion?: string;
  };
  timestamp: Date;
  metrics: {
    spo2: number | null;
  };
  isValid: boolean;
}

interface ContinuousSPO2Entry {
  logTimestamp: Date;
  dataDate: Date;
  frequency: number;
  spo2Max: number;
  spo2Min: number;
  spo2Values: number[];
}

export class LunaIOSSPO2Parser {
  /**
   * Parse Luna iOS continuous SPO2 data from ZHDRingsLogs.txt
   * @param filePath - Path to the Luna iOS log file (ZHDRingsLogs.txt)
   * @param meta - Session metadata (sessionId, userId, firmwareVersion, bandPosition, activityType)
   * @param startTime - Session start time for filtering (also used to extract target date)
   * @param endTime - Session end time for filtering
   * @returns Promise<NormalizedReadingInput[]> - Array of normalized SPO2 readings
   */
  static async parse(
    filePath: string,
    meta: {
      sessionId: any;
      userId: any;
      firmwareVersion?: string;
      bandPosition?: string;
      activityType: string;
    },
    startTime: Date,
    endTime: Date
  ): Promise<NormalizedReadingInput[]> {
    console.log('\n🩺 ========================================');
    console.log('🩺 Luna iOS SPO2 Parser');
    console.log('🩺 File path:', filePath);
    console.log('🩺 Activity type:', meta.activityType);
    console.log('🩺 Time range:', startTime.toISOString(), ' to ', endTime.toISOString());
    console.log('🩺 ========================================\n');

    try {
      // Read the log file
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract date from startTime and search for that specific date's data
      // Use UTC methods to avoid timezone issues
      const targetDate = new Date(startTime);
      targetDate.setUTCHours(0, 0, 0, 0);
      const targetDateEnd = new Date(startTime);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      console.log('🩺 Extracting data for date:', targetDate.toISOString().split('T')[0]);
      console.log('🩺 Will filter readings to time range:', startTime.toISOString(), 'to', endTime.toISOString());

      // Dictionary to store the latest data for each date
      // Key: date string (YYYY-MM-DD), Value: entry with latest LOG timestamp
      const dateEntries = new Map<string, ContinuousSPO2Entry>();

      // Pattern to match ContinuousBloodOxygenData blocks with LOG timestamp
      // LOG: 2026-Mar-03 12:34:56 : <ContinuousBloodOxygenData> Obtained daily data: Date:2026-3-3 0:0:0 frequency:15 bloodOxygenMaxValue:99 bloodOxygenMinValue:95 subStr:97,98,99,96,95,...
      const pattern = /LOG:\s*(\d{4})-([A-Za-z]{3})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*:.*?<ContinuousBloodOxygenData> Obtained daily data:\s+Date:(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)\s+frequency:(\d+)\s+bloodOxygenMaxValue:(\d+)\s+bloodOxygenMinValue:(\d+)\s+subStr:([\d,\s]+)/g;

      let match;
      let matchCount = 0;

      // Month name to number mapping
      const monthMap: { [key: string]: number } = {
        'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
        'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
      };

      while ((match = pattern.exec(content)) !== null) {
        matchCount++;
        
        // Parse LOG timestamp
        const logYear = parseInt(match[1]);
        const logMonthStr = match[2];
        const logDay = parseInt(match[3]);
        const logHour = parseInt(match[4]);
        const logMinute = parseInt(match[5]);
        const logSecond = parseInt(match[6]);
        
        const logMonth = monthMap[logMonthStr] || 1;
        const logTimestamp = new Date(Date.UTC(logYear, logMonth - 1, logDay, logHour, logMinute, logSecond));
        
        // Parse data date
        const year = parseInt(match[7]);
        const month = parseInt(match[8]);
        const day = parseInt(match[9]);
        const hour = parseInt(match[10]);
        const minute = parseInt(match[11]);
        const second = parseInt(match[12]);
        const frequency = parseInt(match[13]);
        const spo2Max = parseInt(match[14]);
        const spo2Min = parseInt(match[15]);
        const spo2ValuesStr = match[16];

        // Create date object for this record (in UTC to match targetDate)
        const recordDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        const recordDateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        // Check if this record matches our target date (from startTime)
        if (recordDateOnly < targetDate || recordDateOnly > targetDateEnd) {
          continue;
        }

        // Parse SpO2 values
        const spo2Values = spo2ValuesStr
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0)
          .map(v => parseInt(v));

        // Create a unique key for this date
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Check if we already have an entry for this date
        const existingEntry = dateEntries.get(dateKey);
        
        // Store this entry if it's the first or has a later LOG timestamp
        if (!existingEntry || logTimestamp > existingEntry.logTimestamp) {
          dateEntries.set(dateKey, {
            logTimestamp,
            dataDate: recordDate,
            frequency,
            spo2Max,
            spo2Min,
            spo2Values
          });

          console.log(`🩺 ${existingEntry ? 'Updated' : 'Found'} SPO2 data for ${dateKey}: ${spo2Values.length} readings, frequency: ${frequency} min, LOG timestamp: ${logTimestamp.toISOString()}`);
        }
      }

      console.log(`🩺 Total matches found: ${matchCount}`);
      console.log(`🩺 Unique dates with SPO2 data: ${dateEntries.size}`);

      if (dateEntries.size === 0) {
        console.log('🩺 ⚠️ No SPO2 data found in the specified date range');
        return [];
      }

      // Debug: Log the date entries found
      console.log('\n🩺 DEBUG: Date entries found:');
      for (const [dateKey, entry] of dateEntries) {
        console.log(`  ${dateKey}: ${entry.spo2Values.length} values, frequency: ${entry.frequency} min`);
        console.log(`  Data date: ${entry.dataDate.toISOString()}`);
        console.log(`  LOG timestamp: ${entry.logTimestamp.toISOString()}`);
      }

      // Debug: Log filtering parameters
      console.log('\n🩺 DEBUG: Filtering parameters:');
      console.log(`  startTime (UTC): ${startTime.toISOString()}`);
      console.log(`  endTime (UTC): ${endTime.toISOString()}`);
      console.log(`  startTime timestamp: ${startTime.getTime()}`);
      console.log(`  endTime timestamp: ${endTime.getTime()}`);

      // Generate normalized readings for all dates
      const normalizedReadings: NormalizedReadingInput[] = [];

      for (const [dateKey, entry] of dateEntries) {
        // Parse the date components from dateKey
        const [year, month, day] = dateKey.split('-').map(Number);
        
        // Start generating timestamps from midnight of this date (in UTC to match startTime/endTime)
        const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        console.log(`\n🩺 Processing ${entry.spo2Values.length} SPO2 values for ${dateKey}`);
        console.log(`  Base date (UTC): ${baseDate.toISOString()}`);
        console.log(`  Base date timestamp: ${baseDate.getTime()}`);
        console.log(`  Frequency: ${entry.frequency} minutes`);

        let inRangeCount = 0;
        let outRangeCount = 0;

        for (let idx = 0; idx < entry.spo2Values.length; idx++) {
          const spo2Value = entry.spo2Values[idx];
          
          // Calculate timestamp (each reading is 'frequency' minutes apart)
          const timestamp = new Date(baseDate.getTime() + idx * entry.frequency * 60 * 1000);

          // Debug: Log first few timestamps
          if (idx < 3) {
            console.log(`  Sample timestamp [${idx}]: ${timestamp.toISOString()} (${timestamp.getTime()})`);
            console.log(`    Is in range? ${timestamp >= startTime && timestamp <= endTime}`);
            console.log(`    timestamp >= startTime: ${timestamp >= startTime} (${timestamp.getTime()} >= ${startTime.getTime()})`);
            console.log(`    timestamp <= endTime: ${timestamp <= endTime} (${timestamp.getTime()} <= ${endTime.getTime()})`);
          }

          // Filter by session time range
          if (timestamp < startTime || timestamp > endTime) {
            outRangeCount++;
            continue;
          }

          inRangeCount++;

          // Create normalized reading
          const reading: NormalizedReadingInput = {
            meta: {
              sessionId: meta.sessionId,
              userId: meta.userId,
              deviceType: 'luna',
              activityType: meta.activityType,
              bandPosition: meta.bandPosition,
              firmwareVersion: meta.firmwareVersion,
            },
            timestamp: timestamp,
            metrics: {
              spo2: spo2Value > 0 ? spo2Value : null, // Mark 0 as invalid (no data)
            },
            isValid: spo2Value > 0, // Invalid if SpO2 is 0 or negative
          };

          normalizedReadings.push(reading);
        }

        console.log(`  ✅ Readings in range: ${inRangeCount}`);
        console.log(`  ⏭️  Readings out of range: ${outRangeCount}`);
      }

      console.log('\n🩺 ========================================');
      console.log(`🩺 Total normalized SPO2 readings: ${normalizedReadings.length}`);
      console.log('🩺 ========================================\n');

      return normalizedReadings;

    } catch (error) {
      console.error('🩺 ❌ Error parsing Luna iOS SPO2 log file:', error);
      throw error;
    }
  }
}

/**
 * Convenience function to parse Luna iOS SPO2 CSV file
 * This is the main entry point called by the ingestion service
 */
export async function parseLunaIosSpo2Csv(
  filePath: string,
  meta: {
    activityType: string;
    bandPosition?: string;
    sessionId: any;
    userId: any;
    firmwareVersion?: string;
  },
  startTime: Date,
  endTime: Date
): Promise<NormalizedReadingInput[]> {
  return LunaIOSSPO2Parser.parse(filePath, meta, startTime, endTime);
}
