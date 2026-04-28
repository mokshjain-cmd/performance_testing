/**
 * Luna Android SPO2 Parser
 * Parses Luna device SPO2 data from Android app logs
 * Extracts continuous blood oxygen data with 15-minute intervals
 * 
 * Log format example:
 * 2026-04-10 22:49:31.993 I/X-LOG: LUNA-> onContinuousBloodOxygenData : ContinuousBloodOxygenBean{bloodOxygenFrequency=15, bloodOxygenData=[0, 0, 0, ...], max=0, min=0, bloodOxygenMaxValue=[], bloodOxygenMinValue=[], date='2026-04-10 00:00:00'}
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
  date: Date;
  frequency: number; // In minutes for SPO2
  spo2Max: number;
  spo2Min: number;
  spo2Values: number[];
  logTimestamp: Date; // When the log was recorded (for deduplication - keep latest)
}

export class LunaAndroidSPO2Parser {
  /**
   * Parse Luna Android continuous SPO2 data from app logs
   * @param filePath - Path to the Luna Android log file
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
    console.log('\n🩺 ========================================');
    console.log('🩺 Luna Android SPO2 Parser');
    console.log('🩺 File path:', filePath);
    console.log('🩺 Activity type:', meta.activityType);
    console.log('🩺 Time range:', startTime.toISOString(), ' to ', endTime.toISOString());
    console.log('🩺 ========================================\n');

    try {
      // Read the log file
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract date from startTime and search for that specific date's data
      const targetDate = new Date(startTime);
      targetDate.setUTCHours(0, 0, 0, 0);
      const targetDateEnd = new Date(startTime);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      console.log('🩺 Extracting data for date:', targetDate.toISOString().split('T')[0]);
      console.log('🩺 Will filter readings to time range:', startTime.toISOString(), 'to', endTime.toISOString());

      // Dictionary to store the latest data for each date
      const dateEntries = new Map<string, ContinuousSPO2Entry>();

      // Pattern to match Android onContinuousBloodOxygenData Bean lines
      // Format: 2026-04-10 22:49:31.993 I/X-LOG: LUNA-> onContinuousBloodOxygenData : ContinuousBloodOxygenBean{bloodOxygenFrequency=15, bloodOxygenData=[...], max=0, min=0, ..., date='2026-04-10 00:00:00'}
      const pattern = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d+)\s+I\/X-LOG:\s+LUNA->\s+onContinuousBloodOxygenData\s+:\s+ContinuousBloodOxygenBean\{bloodOxygenFrequency=(\d+),\s*bloodOxygenData=\[([\d,\s]*)\],\s*max=(\d+),\s*min=(\d+),.*?date='(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}'\}/g;

      let match;
      let matchCount = 0;

      while ((match = pattern.exec(content)) !== null) {
        try {
          const logDateStr = match[1]; // e.g., "2026-04-10"
          const logTimeStr = match[2]; // e.g., "22:49:31.993"
          const frequency = parseInt(match[3]); // e.g., 15 (minutes)
          const spo2DataStr = match[4]; // e.g., "0, 0, 0, 98, 99, ..."
          const spo2Max = parseInt(match[5]);
          const spo2Min = parseInt(match[6]);
          const dateField = match[7]; // e.g., "2026-04-10"

          // Parse SPO2 values array
          const spo2Values = spo2DataStr
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map(v => parseInt(v));

          if (spo2Values.length === 0) {
            continue;
          }

          // Parse the date field
          const [year, month, day] = dateField.split('-').map(Number);

          // Create date object for this record (midnight UTC)
          const recordDateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

          // Check if this record matches our target date (from startTime)
          if (recordDateOnly < targetDate || recordDateOnly > targetDateEnd) {
            continue;
          }

          matchCount++;

          // Parse log timestamp for deduplication (keep latest)
          const [logHour, logMin, logSecMs] = logTimeStr.split(':');
          const [logSec] = logSecMs.split('.');
          const logTimestamp = new Date(Date.UTC(
            parseInt(logDateStr.split('-')[0]),
            parseInt(logDateStr.split('-')[1]) - 1,
            parseInt(logDateStr.split('-')[2]),
            parseInt(logHour),
            parseInt(logMin),
            parseInt(logSec)
          ));

          // Create a unique key for this date
          const dateKey = dateField; // e.g., "2026-04-10"

          // Check if we already have an entry for this date
          const existingEntry = dateEntries.get(dateKey);

          // Keep the entry with the most non-zero values (ring clears buffer after sync)
          const nonZeroCount = spo2Values.filter(v => v > 0).length;
          const existingNonZeroCount = existingEntry ? existingEntry.spo2Values.filter(v => v > 0).length : 0;
          
          if (!existingEntry || nonZeroCount > existingNonZeroCount) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              spo2Max,
              spo2Min,
              spo2Values,
              logTimestamp,
            });

            console.log(`🩺 ${existingEntry ? 'Updated' : 'Found'} SPO2 data for ${dateKey}: ${spo2Values.length} readings (${nonZeroCount} valid), frequency: ${frequency} min, LOG: ${logTimestamp.toISOString()}`);
          }
        } catch (parseError) {
          // Skip malformed entries
          console.warn('🩺 ⚠️ Skipping malformed entry:', parseError);
          continue;
        }
      }

      console.log(`🩺 Total app log matches found: ${matchCount}`);

      // BLE Log Pattern: fitnessparsing continuousBloodOxygenData = ContinuousBloodOxygenBean{...}
      // Format: 2026-04-27 00:00:17:509 ----> fitnessparsing -----------> parsingFitness continuousBloodOxygenData = ContinuousBloodOxygenBean{bloodOxygenFrequency=5, bloodOxygenData=[...], max=0, min=0, ..., date='2026-04-27 00:00:00'}
      const blePattern = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}:\d+)\s+---+>\s+fitnessparsing\s+---+>\s+parsingFitness\s+continuousBloodOxygenData\s+=\s+ContinuousBloodOxygenBean\{bloodOxygenFrequency=(\d+),\s*bloodOxygenData=\[([\d,\s]*)\],\s*max=(\d+),\s*min=(\d+),.*?date='(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}:\d{2}'\}/g;

      let bleMatch;
      let bleMatchCount = 0;

      while ((bleMatch = blePattern.exec(content)) !== null) {
        try {
          const logDateStr = bleMatch[1]; // e.g., "2026-04-27"
          const logTimeStr = bleMatch[2]; // e.g., "00:00:17:509" (colon before ms)
          const frequency = parseInt(bleMatch[3]); // e.g., 5 (frequency value)
          const spo2DataStr = bleMatch[4]; // e.g., "0, 0, 0, 98, 99, ..."
          const spo2Max = parseInt(bleMatch[5]);
          const spo2Min = parseInt(bleMatch[6]);
          const dateField = bleMatch[7]; // e.g., "2026-04-27"

          // Parse SPO2 values array
          const spo2Values = spo2DataStr
            .split(',')
            .map(v => v.trim())
            .filter(v => v.length > 0)
            .map(v => parseInt(v));

          if (spo2Values.length === 0) {
            continue;
          }

          // Parse the date field
          const [year, month, day] = dateField.split('-').map(Number);

          // Create date object for this record (midnight UTC)
          const recordDateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

          // Check if this record matches our target date
          if (recordDateOnly < targetDate || recordDateOnly > targetDateEnd) {
            continue;
          }

          bleMatchCount++;

          // Parse BLE log timestamp (uses colon before ms: HH:MM:SS:mmm)
          const [logHour, logMin, logSec] = logTimeStr.split(':');
          const logTimestamp = new Date(Date.UTC(
            parseInt(logDateStr.split('-')[0]),
            parseInt(logDateStr.split('-')[1]) - 1,
            parseInt(logDateStr.split('-')[2]),
            parseInt(logHour),
            parseInt(logMin),
            parseInt(logSec)
          ));

          // Create a unique key for this date
          const dateKey = dateField;

          // Check if we already have an entry for this date
          const existingEntry = dateEntries.get(dateKey);

          // Keep the entry with the most non-zero values (ring clears buffer after sync)
          const nonZeroCount = spo2Values.filter(v => v > 0).length;
          const existingNonZeroCount = existingEntry ? existingEntry.spo2Values.filter(v => v > 0).length : 0;
          
          if (!existingEntry || nonZeroCount > existingNonZeroCount) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              spo2Max,
              spo2Min,
              spo2Values,
              logTimestamp,
            });

            console.log(`🩺 [BLE] ${existingEntry ? 'Updated' : 'Found'} SPO2 data for ${dateKey}: ${spo2Values.length} readings (${nonZeroCount} valid), frequency: ${frequency}, LOG: ${logTimestamp.toISOString()}`);
          }
        } catch (parseError) {
          console.warn('🩺 ⚠️ Skipping malformed BLE entry:', parseError);
          continue;
        }
      }

      console.log(`🩺 Total BLE log matches found: ${bleMatchCount}`);
      console.log(`🩺 Unique dates with SPO2 data: ${dateEntries.size}`);

      if (dateEntries.size === 0) {
        console.log('🩺 ⚠️ No SPO2 data found in the specified date range');
        return [];
      }

      // Debug: Log the date entries found
      console.log('\n🩺 DEBUG: Date entries found:');
      for (const [dateKey, entry] of dateEntries) {
        console.log(`  ${dateKey}: ${entry.spo2Values.length} values, frequency: ${entry.frequency} min`);
        console.log(`  Record date: ${entry.date.toISOString()}`);
        console.log(`  Log timestamp: ${entry.logTimestamp.toISOString()}`);
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

        // Start generating timestamps from midnight of this date (in UTC)
        const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        console.log(`\n🩺 Processing ${entry.spo2Values.length} SPO2 values for ${dateKey}`);
        console.log(`  Base date (UTC): ${baseDate.toISOString()}`);
        console.log(`  Base date timestamp: ${baseDate.getTime()}`);
        console.log(`  Frequency: ${entry.frequency} minutes`);

        let inRangeCount = 0;
        let outRangeCount = 0;

        for (let idx = 0; idx < entry.spo2Values.length; idx++) {
          const spo2Value = entry.spo2Values[idx];

          // Calculate timestamp (each reading is 'frequency' MINUTES apart for SPO2)
          const timestamp = new Date(baseDate.getTime() + idx * entry.frequency * 60 * 1000);

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
              spo2: spo2Value > 0 ? spo2Value : null,
            },
            isValid: spo2Value > 0, // Mark as invalid if SPO2 is 0 (no data)
          };

          normalizedReadings.push(reading);
        }

        console.log(`  ✅ Readings in range: ${inRangeCount}`);
        console.log(`  ⏭️  Readings out of range: ${outRangeCount}`);
      }

      console.log(`\n🩺 ✅ Generated ${normalizedReadings.length} SPO2 readings`);

      if (normalizedReadings.length > 0) {
        const validReadings = normalizedReadings.filter(r => r.isValid);
        const spo2Values = validReadings
          .map(r => r.metrics.spo2)
          .filter((spo2): spo2 is number => spo2 !== null);

        if (spo2Values.length > 0) {
          console.log(`🩺 Summary:`);
          console.log(`🩺   - Valid readings: ${validReadings.length}`);
          console.log(`🩺   - Invalid readings: ${normalizedReadings.length - validReadings.length}`);
          console.log(`🩺   - SPO2 range: ${Math.min(...spo2Values)} - ${Math.max(...spo2Values)} %`);
          console.log(`🩺   - SPO2 average: ${(spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length).toFixed(1)} %`);
          console.log(`🩺   - Start time: ${normalizedReadings[0].timestamp.toISOString()}`);
          console.log(`🩺   - End time: ${normalizedReadings[normalizedReadings.length - 1].timestamp.toISOString()}`);
        }
      }

      console.log('🩺 ========================================\n');

      return normalizedReadings;

    } catch (error) {
      console.error('❌ Error parsing Luna Android SPO2 data:', error);
      throw new Error(
        `Failed to parse Luna Android SPO2 data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Convenience function to parse Luna Android SPO2 file
 * This is the main entry point called by the ingestion service
 */
export async function parseLunaAndroidSpo2(
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
  return LunaAndroidSPO2Parser.parse(filePath, meta, startTime, endTime);
}
