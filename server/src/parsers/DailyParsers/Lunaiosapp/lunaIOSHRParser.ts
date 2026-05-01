/**
 * Luna iOS HR Parser
 * Parses Luna device HR data from iOS ZHDRingsLogs.txt format
 * Extracts continuous heart rate data with 30-second intervals (standardized)
 * 
 * Log format example:
 * LOG: 2026-Apr-29 19:48:35 : [V2.3.0]<ContinuousHeartRateData> Obtained daily data:
 *  Date:2026-4-29 0:0:0 
 *  frequency:30 
 *  heartRateMaxValue:125 
 *  heartRateMinValue:48 
 *  restingHeartRateValue:0 
 *  subStr:76,87,84,96,94,...
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
    heartRate: number | null;
  };
  isValid: boolean;
}

interface ContinuousHREntry {
  date: Date;
  frequency: number; // From log (in minutes), but we use 30-second intervals for timestamps
  hrMax: number;
  hrMin: number;
  restingHr: number;
  hrValues: number[];
  logTimestamp: Date; // When the log was recorded (for deduplication - keep latest)
}

export class LunaIOSHRParser {
  /**
   * Parse Luna iOS continuous HR data from ZHDRingsLogs.txt format
   * @param filePath - Path to the Luna iOS log file (ZHDRingsLogs.txt)
   * @param meta - Session metadata (sessionId, userId, firmwareVersion, bandPosition, activityType)
   * @param startTime - Session start time for filtering
   * @param endTime - Session end time for filtering
   * @returns Promise<NormalizedReadingInput[]> - Array of normalized readings
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
    console.log('\n📱 ========================================');
    console.log('📱 Luna iOS HR Parser');
    console.log('📱 File path:', filePath);
    console.log('📱 Activity type:', meta.activityType);
    console.log('📱 Time range:', startTime.toISOString(), ' to ', endTime.toISOString());
    console.log('📱 ========================================\n');

    try {
      // Read the log file
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract date from startTime and search for that specific date's data
      const targetDate = new Date(startTime);
      targetDate.setUTCHours(0, 0, 0, 0);
      const targetDateEnd = new Date(startTime);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      console.log('📱 Extracting data for date:', targetDate.toISOString().split('T')[0]);
      console.log('📱 Will filter readings to time range:', startTime.toISOString(), 'to', endTime.toISOString());

      // Dictionary to store the latest data for each date
      const dateEntries = new Map<string, ContinuousHREntry>();

      // Pattern to match ContinuousHeartRateData blocks in iOS logs
      // Format: LOG: YYYY-Mon-DD HH:MM:SS : [VERSION]<ContinuousHeartRateData> Obtained daily data:
      //         Date:YYYY-M-D H:M:S 
      //         frequency:N 
      //         heartRateMaxValue:N 
      //         heartRateMinValue:N 
      //         restingHeartRateValue:N 
      //         subStr:N,N,N,...
      const pattern = /LOG:\s+(\d{4})-([A-Za-z]+)-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+:\s+\[V([\d.]+)\]<ContinuousHeartRateData>\s+Obtained daily data:\s+Date:(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+)\s+frequency:(\d+)\s+heartRateMaxValue:(\d+)\s+heartRateMinValue:(\d+)\s+restingHeartRateValue:(\d+)\s+subStr:([\d,\s]+)/g;

      let match;
      let matchCount = 0;

      while ((match = pattern.exec(content)) !== null) {
        try {
          // Log line date/time (when recorded)
          const logYear = parseInt(match[1]);
          const logMonthStr = match[2];
          const logDay = parseInt(match[3]);
          const logHour = parseInt(match[4]);
          const logMin = parseInt(match[5]);
          const logSec = parseInt(match[6]);
          const firmwareVersion = match[7];

          // Data date components (from Date field in log)
          const dataYear = parseInt(match[8]);
          const dataMonth = parseInt(match[9]);
          const dataDay = parseInt(match[10]);
          const dataHour = parseInt(match[11]);
          const dataMin = parseInt(match[12]);
          const dataSec = parseInt(match[13]);

          const frequency = parseInt(match[14]); // frequency in the log (often in minutes, will be ignored for timestamp generation)
          const hrMax = parseInt(match[15]);
          const hrMin = parseInt(match[16]);
          const restingHr = parseInt(match[17]);
          const hrValuesStr = match[18];

          // Parse heart rate values
          const hrValues: number[] = hrValuesStr
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map(v => parseInt(v))
            .filter(v => !isNaN(v));

          if (!hrValues || hrValues.length === 0) {
            continue;
          }

          // Create date object for this record (midnight UTC)
          const recordDateOnly = new Date(Date.UTC(dataYear, dataMonth - 1, dataDay, 0, 0, 0));

          // Check if this record matches our target date (from startTime)
          if (recordDateOnly < targetDate || recordDateOnly > targetDateEnd) {
            continue;
          }

          matchCount++;

          // Convert month string to number (Jan=1, Feb=2, etc.)
          const monthMap: { [key: string]: number } = {
            'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
          };
          const logMonthNum = monthMap[logMonthStr] || parseInt(logMonthStr);

          // Parse log timestamp for deduplication (keep latest)
          const logTimestamp = new Date(Date.UTC(logYear, logMonthNum - 1, logDay, logHour, logMin, logSec));

          // Create a unique key for this date (YYYY-MM-DD format)
          const dateKey = `${dataYear}-${String(dataMonth).padStart(2, '0')}-${String(dataDay).padStart(2, '0')}`;

          // Check if we already have an entry for this date
          const existingEntry = dateEntries.get(dateKey);

          // Keep the entry with the most non-zero values (ring clears buffer after sync)
          const nonZeroCount = hrValues.filter(v => v > 0 && v !== 255).length;
          const existingNonZeroCount = existingEntry ? existingEntry.hrValues.filter(v => v > 0 && v !== 255).length : 0;

          if (!existingEntry || nonZeroCount > existingNonZeroCount) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              hrMax,
              hrMin,
              restingHr,
              hrValues,
              logTimestamp,
            });

            console.log(`📱 Found HR data for ${dateKey}: ${hrValues.length} readings (${nonZeroCount} valid), frequency: ${frequency} (from log)`);
          }
        } catch (parseError) {
          // Skip malformed entries
          console.warn('📱 ⚠️ Skipping malformed iOS log entry:', parseError);
          continue;
        }
      }

      console.log(`📱 Total iOS log matches found: ${matchCount}`);
      console.log(`📱 Unique dates with HR data: ${dateEntries.size}`);

      if (dateEntries.size === 0) {
        console.log('📱 ⚠️ No heart rate data found in the specified date range');
        return [];
      }

      // Debug: Log the date entries found
      console.log('\n📱 DEBUG: Date entries found:');
      for (const [dateKey, entry] of dateEntries) {
        console.log(`  ${dateKey}: ${entry.hrValues.length} values, frequency: ${entry.frequency} (from log)`);
        console.log(`  Record date: ${entry.date.toISOString()}`);
        console.log(`  Log timestamp: ${entry.logTimestamp.toISOString()}`);
      }

      // Debug: Log filtering parameters
      console.log('\n📱 DEBUG: Filtering parameters:');
      console.log(`  startTime (UTC): ${startTime.toISOString()}`);
      console.log(`  endTime (UTC): ${endTime.toISOString()}`);
      console.log(`  startTime timestamp: ${startTime.getTime()}`);
      console.log(`  endTime timestamp: ${endTime.getTime()}`);

      // Generate normalized readings for all dates
      const normalizedReadings: NormalizedReadingInput[] = [];

      for (const [dateKey, entry] of dateEntries) {
        // Parse the date components from dateKey
        const [year, month, day] = dateKey.split('-').map(Number);

        // Start generating timestamps from midnight of this date (in UTC)
        const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        console.log(`\n📱 Processing ${entry.hrValues.length} HR values for ${dateKey}`);
        console.log(`  Base date (UTC): ${baseDate.toISOString()}`);
        console.log(`  Base date timestamp: ${baseDate.getTime()}`);
        console.log(`  Standardized frequency: 30 seconds (log frequency was ${entry.frequency})`);

        let inRangeCount = 0;
        let outRangeCount = 0;

        for (let idx = 0; idx < entry.hrValues.length; idx++) {
          const hrValue = entry.hrValues[idx];

          // Calculate timestamp using standardized 30-second intervals
          // (NOT using the frequency from the log - we standardize to 30 seconds for consistency with Android)
          const timestamp = new Date(baseDate.getTime() + idx * 30 * 1000);

          // Debug: Log first few timestamps
          if (idx < 3) {
            console.log(`  Sample timestamp [${idx}]: ${timestamp.toISOString()} (${timestamp.getTime()})`);
            console.log(`    Is in range? ${timestamp >= startTime && timestamp <= endTime}`);
          }

          // Filter by session time range
          if (timestamp < startTime || timestamp > endTime) {
            outRangeCount++;
            continue;
          }

          inRangeCount++;

          // Skip invalid HR values (0 = no data, 255 = sensor error/placeholder)
          if (hrValue <= 0 || hrValue === 255) {
            continue;
          }

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
              heartRate: hrValue,
            },
            isValid: true,
          };

          normalizedReadings.push(reading);
        }

        console.log(`  ✅ Readings in range: ${inRangeCount}`);
        console.log(`  ⏭️  Readings out of range: ${outRangeCount}`);
      }

      console.log(`\n📱 ✅ Generated ${normalizedReadings.length} heart rate readings`);

      if (normalizedReadings.length > 0) {
        const validReadings = normalizedReadings.filter(r => r.isValid);
        const hrValues = validReadings
          .map(r => r.metrics.heartRate)
          .filter((hr): hr is number => hr !== null);

        if (hrValues.length > 0) {
          console.log(`📱 Summary:`);
          console.log(`📱   - Valid readings: ${validReadings.length}`);
          console.log(`📱   - Invalid readings: ${normalizedReadings.length - validReadings.length}`);
          console.log(`📱   - HR range: ${Math.min(...hrValues)} - ${Math.max(...hrValues)} bpm`);
          console.log(`📱   - HR average: ${(hrValues.reduce((a, b) => a + b, 0) / hrValues.length).toFixed(1)} bpm`);
          console.log(`📱   - Start time: ${normalizedReadings[0].timestamp.toISOString()}`);
          console.log(`📱   - End time: ${normalizedReadings[normalizedReadings.length - 1].timestamp.toISOString()}`);
        }
      }

      console.log('📱 ========================================\n');

      return normalizedReadings;

    } catch (error) {
      console.error('❌ Error parsing Luna iOS HR data:', error);
      throw new Error(
        `Failed to parse Luna iOS HR data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
