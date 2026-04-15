/**
 * Luna Android HR Parser
 * Parses Luna device HR data from Android app logs
 * Extracts continuous heart rate data with 30-second intervals
 * 
 * Log format example:
 * 2026-04-10 22:49:31.559 I/X-LOG: LUNA-> onContinuousHeartRateData : {"continuousHeartRateFrequency":30,...,"date":"2026-04-10 00:00:00"}
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
  frequency: number; // In seconds for Android
  hrMax: number;
  hrMin: number;
  restingHr: number;
  hrValues: number[];
  logTimestamp: Date; // When the log was recorded (for deduplication - keep latest)
}

export class LunaAndroidHRParser {
  /**
   * Parse Luna Android continuous HR data from app logs
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
    console.log('\n📱 ========================================');
    console.log('📱 Luna Android HR Parser');
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

      // Pattern to match Android onContinuousHeartRateData JSON lines
      // Format: 2026-04-10 22:49:31.559 I/X-LOG: LUNA-> onContinuousHeartRateData : {JSON}
      const pattern = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}\.\d+)\s+I\/X-LOG:\s+LUNA->\s+onContinuousHeartRateData\s+:\s+(\{[^}]+?"heartRateData":\[[^\]]*\][^}]*\})/g;

      let match;
      let matchCount = 0;

      while ((match = pattern.exec(content)) !== null) {
        try {
          const logDateStr = match[1]; // e.g., "2026-04-10"
          const logTimeStr = match[2]; // e.g., "22:49:31.559"
          const jsonStr = match[3];

          // Parse the JSON payload
          const data = JSON.parse(jsonStr);

          // Extract fields from JSON
          const frequency = data.continuousHeartRateFrequency || 30; // Default 30 seconds
          const hrValues: number[] = data.heartRateData || [];
          const hrMax = data.max || 0;
          const hrMin = data.min || 0;
          const restingHr = data.restingRate || 0;
          const dateField = data.date || ''; // e.g., "2026-04-10 00:00:00"

          if (!dateField || hrValues.length === 0) {
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

          // Keep the latest entry (based on log timestamp)
          if (!existingEntry || logTimestamp > existingEntry.logTimestamp) {
            dateEntries.set(dateKey, {
              date: recordDateOnly,
              frequency,
              hrMax,
              hrMin,
              restingHr,
              hrValues,
              logTimestamp,
            });

            console.log(`📱 Found HR data for ${dateKey}: ${hrValues.length} readings, frequency: ${frequency} sec`);
          }
        } catch (parseError) {
          // Skip malformed JSON entries
          console.warn('📱 ⚠️ Skipping malformed JSON entry:', parseError);
          continue;
        }
      }

      console.log(`📱 Total matches found: ${matchCount}`);
      console.log(`📱 Unique dates with HR data: ${dateEntries.size}`);

      if (dateEntries.size === 0) {
        console.log('📱 ⚠️ No heart rate data found in the specified date range');
        return [];
      }

      // Debug: Log the date entries found
      console.log('\n📱 DEBUG: Date entries found:');
      for (const [dateKey, entry] of dateEntries) {
        console.log(`  ${dateKey}: ${entry.hrValues.length} values, frequency: ${entry.frequency} sec`);
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
        console.log(`  Frequency: ${entry.frequency} seconds`);

        let inRangeCount = 0;
        let outRangeCount = 0;

        for (let idx = 0; idx < entry.hrValues.length; idx++) {
          const hrValue = entry.hrValues[idx];

          // Calculate timestamp (each reading is 'frequency' SECONDS apart for Android)
          const timestamp = new Date(baseDate.getTime() + idx * entry.frequency * 1000);

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
              heartRate: hrValue > 0 ? hrValue : null,
            },
            isValid: hrValue > 0, // Mark as invalid if HR is 0 (no data)
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
      console.error('❌ Error parsing Luna Android HR data:', error);
      throw new Error(
        `Failed to parse Luna Android HR data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
