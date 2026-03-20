/**
 * Luna iOS HR Parser
 * Parses Luna device HR data from iOS ZHDRingsLogs.txt format
 * Extracts continuous heart rate data with 5-minute intervals
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
  frequency: number;
  hrMax: number;
  hrMin: number;
  restingHr: number;
  hrValues: number[];
}

export class LunaIOSHRParser {
  /**
   * Parse Luna iOS continuous HR data from ZHDRingsLogs.txt
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
      // Use UTC methods to avoid timezone issues
      const targetDate = new Date(startTime);
      targetDate.setUTCHours(0, 0, 0, 0);
      const targetDateEnd = new Date(startTime);
      targetDateEnd.setUTCHours(23, 59, 59, 999);

      console.log('📱 Extracting data for date:', targetDate.toISOString().split('T')[0]);
      console.log('📱 Will filter readings to time range:', startTime.toISOString(), 'to', endTime.toISOString());

      // Dictionary to store the latest data for each date
      const dateEntries = new Map<string, ContinuousHREntry>();

      // Pattern to match ContinuousHeartRateData blocks
      const pattern = /LOG:.*?<ContinuousHeartRateData> Obtained daily data:\s+Date:(\d+)-(\d+)-(\d+) (\d+):(\d+):(\d+)\s+frequency:(\d+)\s+heartRateMaxValue:(\d+)\s+heartRateMinValue:(\d+)\s+restingHeartRateValue:(\d+)\s+subStr:([\d,\s]+)/g;

      let match;
      let matchCount = 0;

      while ((match = pattern.exec(content)) !== null) {
        matchCount++;
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        const day = parseInt(match[3]);
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const second = parseInt(match[6]);
        const frequency = parseInt(match[7]);
        const hrMax = parseInt(match[8]);
        const hrMin = parseInt(match[9]);
        const restingHr = parseInt(match[10]);
        const hrValuesStr = match[11];

        // Create date object for this record (in UTC to match targetDate)
        const recordDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
        const recordDateOnly = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        // Check if this record matches our target date (from startTime)
        if (recordDateOnly < targetDate || recordDateOnly > targetDateEnd) {
          continue;
        }

        // Parse heart rate values
        const hrValues = hrValuesStr
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0)
          .map(v => parseInt(v));

        // Create a unique key for this date
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // Store this entry (will overwrite if duplicate, keeping the latest)
        dateEntries.set(dateKey, {
          date: recordDate,
          frequency,
          hrMax,
          hrMin,
          restingHr,
          hrValues
        });

        console.log(`📱 Found HR data for ${dateKey}: ${hrValues.length} readings, frequency: ${frequency} min`);
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
        console.log(`  ${dateKey}: ${entry.hrValues.length} values, frequency: ${entry.frequency} min`);
        console.log(`  Record date: ${entry.date.toISOString()}`);
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
        
        // Start generating timestamps from midnight of this date (in UTC to match startTime/endTime)
        const baseDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

        console.log(`\n📱 Processing ${entry.hrValues.length} HR values for ${dateKey}`);
        console.log(`  Base date (UTC): ${baseDate.toISOString()}`);
        console.log(`  Base date timestamp: ${baseDate.getTime()}`);
        console.log(`  Frequency: ${entry.frequency} minutes`);

        let inRangeCount = 0;
        let outRangeCount = 0;

        for (let idx = 0; idx < entry.hrValues.length; idx++) {
          const hrValue = entry.hrValues[idx];
          
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
          console.log(`  ✅ Readings in range: ${inRangeCount}`);
        console.log(`  ⏭️  Readings out of range: ${outRangeCount}`);
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
      }

      console.log(`📱 ✅ Generated ${normalizedReadings.length} heart rate readings`);
      
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
