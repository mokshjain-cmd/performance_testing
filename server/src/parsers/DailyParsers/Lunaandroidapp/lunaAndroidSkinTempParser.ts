/**
 * Luna Android SkinTemp Parser
 * Parses Luna device Skin Temperature data from Android app logs
 * Extracts continuous skin temperature data with 5-minute intervals
 * 
 * Log format example:
 * 2026-04-10 22:48:07.141 I/X-LOG: LUNA-> onContinuousTemperatureData : ContinuousTemperatureBean{temperatureFrequency=5, temperatureData=[3242, 3303, ...], date='2026-04-10 00:00:00'}
 * 
 * Temperature values are raw integers (divide by 100 to get Celsius)
 * e.g., 3242 = 32.42°C
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
    skinTemp: number | null;
  };
  isValid: boolean;
}

interface ContinuousTempEntry {
  date: Date;
  frequency: number; // In minutes for SkinTemp
  tempValues: number[];
  logTimestamp: Date; // When the log was recorded (for deduplication - keep latest)
}

export class LunaAndroidSkinTempParser {
  /**
   * Parse Luna Android continuous skin temperature data from app logs
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
    console.log('\n🌡️ ========================================');
    console.log('🌡️ Luna Android SkinTemp Parser');
    console.log('🌡️ File path:', filePath);
    console.log('🌡️ Activity type:', meta.activityType);
    console.log('🌡️ Time range:', startTime.toISOString(), ' to ', endTime.toISOString());
    console.log('🌡️ ========================================\n');

    try {
      // Read the log file
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract date from startTime and search for that specific date's data
      const targetDate = new Date(startTime);
      targetDate.setUTCHours(0, 0, 0, 0);
      const targetDateEnd = new Date(startTime);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      console.log('🌡️ Extracting data for date:', targetDate.toISOString().split('T')[0]);
      console.log('🌡️ Will filter readings to time range:', startTime.toISOString(), 'to', endTime.toISOString());

      // Dictionary to store the latest data for each date
      const dateEntries = new Map<string, ContinuousTempEntry>();

      // Pattern to match Android onContinuousTemperatureData Bean format
      // Format: 2026-04-10 22:48:07.141 I/X-LOG: LUNA-> onContinuousTemperatureData : ContinuousTemperatureBean{temperatureFrequency=5, temperatureData=[...], date='2026-04-10 00:00:00'}
      const pattern = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d+)\s+I\/X-LOG:\s+LUNA->\s+onContinuousTemperatureData\s+:\s+ContinuousTemperatureBean\{temperatureFrequency=(\d+),\s*temperatureData=\[([\d,\s]*)\],\s*date='([^']+)'\}/g;

      let match;
      let matchCount = 0;

      while ((match = pattern.exec(content)) !== null) {
        try {
          const logDateStr = match[1]; // e.g., "2026-04-10"
          const logTimeStr = match[2]; // e.g., "22:48:07.141"
          const frequency = parseInt(match[3], 10) || 5; // Default 5 minutes
          const tempDataStr = match[4]; // e.g., "3242, 3303, 3347, ..."
          const dateField = match[5]; // e.g., "2026-04-10 00:00:00"

          // Parse temperature values array
          const tempValues: number[] = tempDataStr
            .split(',')
            .map(v => parseInt(v.trim(), 10))
            .filter(v => !isNaN(v));

          if (tempValues.length === 0) {
            continue;
          }

          // Parse the date field to get the date key
          // Format: "2026-04-10 00:00:00"
          const [datePart] = dateField.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);

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
          const dateKey = datePart; // e.g., "2026-04-10"

          // Check if we already have an entry for this date
          const existingEntry = dateEntries.get(dateKey);

          // Keep the entry with the most non-zero values (ring clears buffer after sync)
          const nonZeroCount = tempValues.filter(v => v > 0).length;
          const existingNonZeroCount = existingEntry ? existingEntry.tempValues.filter(v => v > 0).length : 0;
          
          if (!existingEntry || nonZeroCount > existingNonZeroCount) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              tempValues,
              logTimestamp,
            });

            console.log(`🌡️ Found SkinTemp data for ${dateKey}: ${tempValues.length} readings (${nonZeroCount} valid), frequency: ${frequency} min`);
          }
        } catch (parseError) {
          // Skip malformed entries
          console.warn('🌡️ ⚠️ Skipping malformed entry:', parseError);
          continue;
        }
      }

      console.log(`🌡️ Total app log matches found: ${matchCount}`);

      // BLE Log Pattern: fitnessparsing continuousTemperatureData = ContinuousTemperatureBean{...}
      // Format: 2026-04-27 00:00:17:509 ----> fitnessparsing -----------> parsingFitness continuousTemperatureData = ContinuousTemperatureBean{temperatureFrequency=5, temperatureData=[3242, 3303, ...], date='2026-04-27 00:00:00'}
      const blePattern = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}:\d+)\s+---+>\s+fitnessparsing\s+---+>\s+parsingFitness\s+continuousTemperatureData\s+=\s+ContinuousTemperatureBean\{temperatureFrequency=(\d+),\s*temperatureData=\[([\d,\s]*)\],\s*date='([^']+)'\}/g;

      let bleMatch;
      let bleMatchCount = 0;

      while ((bleMatch = blePattern.exec(content)) !== null) {
        try {
          const logDateStr = bleMatch[1]; // e.g., "2026-04-27"
          const logTimeStr = bleMatch[2]; // e.g., "00:00:17:509" (colon before ms)
          const frequency = parseInt(bleMatch[3], 10) || 5; // Default 5 minutes
          const tempDataStr = bleMatch[4]; // e.g., "3242, 3303, 3347, ..."
          const dateField = bleMatch[5]; // e.g., "2026-04-27 00:00:00"

          // Parse temperature values array
          const tempValues: number[] = tempDataStr
            .split(',')
            .map(v => parseInt(v.trim(), 10))
            .filter(v => !isNaN(v));

          if (tempValues.length === 0) {
            continue;
          }

          // Parse the date field to get the date key
          const [datePart] = dateField.split(' ');
          const [year, month, day] = datePart.split('-').map(Number);

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
          const dateKey = datePart;

          // Check if we already have an entry for this date
          const existingEntry = dateEntries.get(dateKey);

          // Keep the entry with the most non-zero values (ring clears buffer after sync)
          const nonZeroCount = tempValues.filter(v => v > 0).length;
          const existingNonZeroCount = existingEntry ? existingEntry.tempValues.filter(v => v > 0).length : 0;
          
          if (!existingEntry || nonZeroCount > existingNonZeroCount) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              tempValues,
              logTimestamp,
            });

            console.log(`🌡️ [BLE] Found SkinTemp data for ${dateKey}: ${tempValues.length} readings (${nonZeroCount} valid), frequency: ${frequency} min`);
          }
        } catch (parseError) {
          console.warn('🌡️ ⚠️ Skipping malformed BLE entry:', parseError);
          continue;
        }
      }

      console.log(`🌡️ Total BLE log matches found: ${bleMatchCount}`);
      console.log(`🌡️ Unique dates with SkinTemp data: ${dateEntries.size}`);

      if (dateEntries.size === 0) {
        console.log('🌡️ ⚠️ No skin temperature data found in the specified date range');
        return [];
      }

      // Debug: Log the date entries found
      console.log('\n🌡️ DEBUG: Date entries found:');
      for (const [dateKey, entry] of dateEntries) {
        console.log(`  ${dateKey}: ${entry.tempValues.length} values, frequency: ${entry.frequency} min`);
        console.log(`  Record date: ${entry.date.toISOString()}`);
        console.log(`  Log timestamp: ${entry.logTimestamp.toISOString()}`);
      }

      // Debug: Log filtering parameters
      console.log('\n🌡️ DEBUG: Filtering parameters:');
      console.log(`  startTime (UTC): ${startTime.toISOString()}`);
      console.log(`  endTime (UTC): ${endTime.toISOString()}`);

      // Generate normalized readings for all dates
      const normalizedReadings: NormalizedReadingInput[] = [];

      for (const [dateKey, entry] of dateEntries) {
        // Parse the date components from dateKey
        const [year, month, day] = dateKey.split('-').map(Number);

        // Start generating timestamps from midnight of this date (in UTC)
        const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        console.log(`\n🌡️ Processing ${entry.tempValues.length} SkinTemp values for ${dateKey}`);
        console.log(`  Base date (UTC): ${baseDate.toISOString()}`);
        console.log(`  Frequency: ${entry.frequency} minutes`);

        let inRangeCount = 0;
        let outRangeCount = 0;
        let validCount = 0;

        for (let idx = 0; idx < entry.tempValues.length; idx++) {
          const rawTempValue = entry.tempValues[idx];

          // Skip zero values (invalid/missing sensor data)
          if (rawTempValue === 0) {
            continue;
          }

          // Calculate timestamp (each reading is 'frequency' MINUTES apart for SkinTemp)
          const timestamp = new Date(baseDate.getTime() + idx * entry.frequency * 60 * 1000);

          // Debug: Log first few timestamps
          if (idx < 3) {
            console.log(`  Sample timestamp [${idx}]: ${timestamp.toISOString()}`);
            console.log(`    Raw value: ${rawTempValue}, Celsius: ${(rawTempValue / 100).toFixed(2)}°C`);
          }

          // Filter by session time range
          if (timestamp < startTime || timestamp > endTime) {
            outRangeCount++;
            continue;
          }

          inRangeCount++;

          // Convert raw value to Celsius (divide by 100)
          const tempCelsius = rawTempValue / 100;
          const isValid = true;

          validCount++;

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
              skinTemp: tempCelsius,
            },
            isValid: isValid,
          };

          normalizedReadings.push(reading);
        }

        console.log(`  ✅ Readings in range: ${inRangeCount} (zero values filtered out)`);
        console.log(`  ⏭️  Readings out of range: ${outRangeCount}`);
      }

      console.log(`\n🌡️ ✅ Generated ${normalizedReadings.length} skin temperature readings`);

      if (normalizedReadings.length > 0) {
        const validReadings = normalizedReadings.filter(r => r.isValid);
        const tempValues = validReadings
          .map(r => r.metrics.skinTemp)
          .filter((temp): temp is number => temp !== null);

        if (tempValues.length > 0) {
          console.log(`🌡️ Summary:`);
          console.log(`🌡️   - Valid readings: ${validReadings.length}`);
          console.log(`🌡️   - Invalid readings (no data): ${normalizedReadings.length - validReadings.length}`);
          console.log(`🌡️   - Temp range: ${Math.min(...tempValues).toFixed(2)} - ${Math.max(...tempValues).toFixed(2)}°C`);
          console.log(`🌡️   - Temp average: ${(tempValues.reduce((a, b) => a + b, 0) / tempValues.length).toFixed(2)}°C`);
          console.log(`🌡️   - Start time: ${normalizedReadings[0].timestamp.toISOString()}`);
          console.log(`🌡️   - End time: ${normalizedReadings[normalizedReadings.length - 1].timestamp.toISOString()}`);
        }
      }

      console.log('🌡️ ========================================\n');

      return normalizedReadings;

    } catch (error) {
      console.error('❌ Error parsing Luna Android SkinTemp data:', error);
      throw new Error(
        `Failed to parse Luna Android SkinTemp data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Convenience function to parse Luna Android SkinTemp data
 */
export async function parseLunaAndroidSkinTemp(
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
  return LunaAndroidSkinTempParser.parse(filePath, meta, startTime, endTime);
}
