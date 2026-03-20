/**
 * Apple Watch SPO2 Parser
 * Parses Apple Health export.xml to extract SpO2 data
 * Extracts oxygen saturation readings and buckets them into 15-minute intervals
 * 
 * Uses streaming approach to handle large Apple Health export files (>500MB)
 */

import fs from 'fs';
import readline from 'readline';

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

interface AppleSpo2Record {
  timestamp: Date;
  value: number;
  source: string;
  device: string;
}

export class AppleSpo2Parser {
  /**
   * Parse Apple Health export.xml to extract SpO2 data
   * @param filePath - Path to the Apple Health export.xml file
   * @param meta - Session metadata (sessionId, userId, firmwareVersion, bandPosition, activityType)
   * @param startTime - Session start time (date used as target date)
   * @param endTime - Session end time for filtering
   * @returns Promise<NormalizedReadingInput[]> - Array of normalized SPO2 readings (96 buckets)
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
    console.log('\n🍎 ========================================');
    console.log('🍎 Apple Watch SPO2 Parser');
    console.log('🍎 File path:', filePath);
    console.log('🍎 Activity type:', meta.activityType);
    console.log('🍎 Time range:', startTime.toISOString(), ' to ', endTime.toISOString());
    console.log('🍎 ========================================\n');

    try {
      // Extract target date from startTime
      const targetDate = new Date(startTime);
      const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
      console.log('🍎 Target date:', targetDateStr);

      // Stream and parse XML file line by line
      console.log('🍎 Streaming XML file (large file support)...');
      const records = await extractAppleWatchSpo2RecordsStreaming(filePath, targetDateStr);

      console.log(`🍎 Found ${records.length} SpO2 records for ${targetDateStr}`);

      // Bucket the data into 15-minute intervals
      const buckets = bucketData(records, 15);
      console.log(`🍎 Data bucketed into ${Object.keys(buckets).length} non-empty 15-minute intervals`);

      // Create normalized readings (all 96 buckets for 24 hours)
      const normalizedReadings = createNormalizedReadings(
        buckets,
        targetDateStr,
        meta
      );

      const validReadings = normalizedReadings.filter(r => r.isValid);
      console.log(`🍎 Created ${normalizedReadings.length} normalized readings (96 total buckets)`);
      console.log(`🍎 Buckets with data: ${validReadings.length}`);

      // Print summary statistics
      if (validReadings.length > 0) {
        const spo2Values = validReadings.map(r => r.metrics.spo2!).filter(v => v !== null);
        const minSpo2 = Math.min(...spo2Values);
        const maxSpo2 = Math.max(...spo2Values);
        const avgSpo2 = spo2Values.reduce((sum, val) => sum + val, 0) / spo2Values.length;

        console.log('\n🍎 Summary Statistics:');
        console.log(`  Total readings: ${spo2Values.length}`);
        console.log(`  Min SpO2: ${minSpo2.toFixed(1)}%`);
        console.log(`  Max SpO2: ${maxSpo2.toFixed(1)}%`);
        console.log(`  Avg SpO2: ${avgSpo2.toFixed(1)}%`);
        console.log(`  Coverage: ${spo2Values.length}/96 buckets (${(spo2Values.length / 96 * 100).toFixed(1)}%)`);
      }

      console.log('\n🍎 ========================================');
      console.log(`🍎 Total normalized SPO2 readings: ${normalizedReadings.length}`);
      console.log('🍎 ========================================\n');

      return normalizedReadings;

    } catch (error) {
      console.error('🍎 ❌ Error parsing Apple Health XML file:', error);
      throw error;
    }
  }

  /**
   * Extract Apple Watch SpO2 records for a specific date from XML content
   * Uses streaming approach to handle large files
   */
  private static async extractAppleWatchSpo2Records(
    xmlContent: string,
    targetDate: string
  ): Promise<AppleSpo2Record[]> {
    // This method is deprecated - use extractAppleWatchSpo2RecordsStreaming instead
    throw new Error('This method should not be called. Use streaming version instead.');
  }
}

/**
 * Extract Apple Watch SpO2 records from XML file using streaming (for large files)
 * Uses line-by-line reading to avoid memory issues
 */
async function extractAppleWatchSpo2RecordsStreaming(
  filePath: string,
  targetDate: string
): Promise<AppleSpo2Record[]> {
  return new Promise((resolve, reject) => {
    const records: AppleSpo2Record[] = [];
    let lineCount = 0;
    let recordCount = 0;
    let matchedRecordCount = 0;

    const targetDateObj = new Date(targetDate);
    targetDateObj.setHours(0, 0, 0, 0);

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    rl.on('line', (line: string) => {
      lineCount++;

      // Look for Record tags with oxygen saturation type
      if (line.includes('<Record') && line.includes('type="HKQuantityTypeIdentifierOxygenSaturation"')) {
        recordCount++;

        // Extract attributes using regex
        const typeMatch = line.match(/type="([^"]+)"/);
        const sourceNameMatch = line.match(/sourceName="([^"]+)"/);
        const startDateMatch = line.match(/startDate="([^"]+)"/);
        const valueMatch = line.match(/value="([^"]+)"/);
        const deviceMatch = line.match(/device="([^"]+)"/);

        if (typeMatch && sourceNameMatch && startDateMatch && valueMatch) {
          const sourceName = sourceNameMatch[1];
          const startDateStr = startDateMatch[1];
          const valueStr = valueMatch[1];
          const device = deviceMatch ? deviceMatch[1] : '';

          // Normalize source name to handle non-breaking spaces (\xa0)
          // This makes it work for any user's Apple Watch
          const normalizedSource = sourceName.replace(/\xa0/g, ' ').replace(/\u00A0/g, ' ');
          const isAppleWatch = normalizedSource.includes('Apple Watch');

          if (isAppleWatch) {
            // Parse datetime (format: "2026-03-02 14:18:42 +0530" or "2026-03-02 14:18:42 -0800")
            // Extract just the date and time portion (ignoring timezone)
            // Add 'Z' to force UTC interpretation (so 08:15:42 stays as 08:15:42 UTC, not converted)
            const dateTimePart = startDateStr.substring(0, 19); // "2026-03-02 14:18:42"
            const timestamp = new Date(dateTimePart.replace(' ', 'T') + 'Z'); // Force UTC

            // Check if this record is for the target date
            const recordDate = new Date(timestamp);
            recordDate.setHours(0, 0, 0, 0);

            if (recordDate.getTime() === targetDateObj.getTime()) {
              matchedRecordCount++;

              // Convert decimal to percentage (0.975 -> 97.5)
              const spo2Percentage = parseFloat(valueStr) * 100;

              records.push({
                timestamp,
                value: spo2Percentage,
                source: sourceName,
                device
              });
            }
          }
        }
      }

      // Log progress every 100,000 lines
      if (lineCount % 100000 === 0) {
        console.log(`🍎 Processed ${lineCount} lines... (${recordCount} SpO2 records, ${matchedRecordCount} matched target date)`);
      }
    });

    rl.on('close', () => {
      console.log(`🍎 XML streaming complete. Scanned ${lineCount} lines`);
      console.log(`🍎 Found ${recordCount} total SpO2 records`);
      console.log(`🍎 Matched ${matchedRecordCount} records for target date ${targetDate}`);
      resolve(records);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Bucket SpO2 records into time intervals
 */
function bucketData(
    records: AppleSpo2Record[],
    bucketMinutes: number
  ): { [key: string]: number[] } {
    const buckets: { [key: string]: number[] } = {};

    for (const record of records) {
      const timestamp = record.timestamp;
      const value = record.value;

      // Calculate bucket start time
      const totalMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
      const bucketStartMinute = Math.floor(totalMinutes / bucketMinutes) * bucketMinutes;
      const bucketHour = Math.floor(bucketStartMinute / 60);
      const bucketMin = bucketStartMinute % 60;

      // Create bucket key in HH:MM format
      const bucketKey = `${bucketHour.toString().padStart(2, '0')}:${bucketMin.toString().padStart(2, '0')}`;

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(value);
    }

    return buckets;
  }

/**
 * Create normalized readings in MongoDB schema format
 * Creates all 96 buckets for a 24-hour day (15-minute intervals)
 */
function createNormalizedReadings(
    buckets: { [key: string]: number[] },
    targetDate: string,
    meta: {
      sessionId: any;
      userId: any;
      firmwareVersion?: string;
      bandPosition?: string;
      activityType: string;
    }
  ): NormalizedReadingInput[] {
    const normalizedReadings: NormalizedReadingInput[] = [];
    const targetDateObj = new Date(targetDate);

    // Iterate through all possible 15-minute buckets in a day (96 buckets)
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const bucketKey = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        // Calculate timestamp for this bucket
        const timestamp = new Date(targetDateObj);
        timestamp.setHours(hour, minute, 0, 0);

        // Get SpO2 values for this bucket
        const spo2Values = buckets[bucketKey] || [];

        // Calculate average if values exist, otherwise null
        let avgSpo2: number | null = null;
        if (spo2Values.length > 0) {
          const sum = spo2Values.reduce((acc, val) => acc + val, 0);
          avgSpo2 = Math.round((sum / spo2Values.length) * 10) / 10; // Round to 1 decimal place
        }

        // Create normalized reading
        const reading: NormalizedReadingInput = {
          meta: {
            sessionId: meta.sessionId,
            userId: meta.userId,
            deviceType: 'apple',
            activityType: meta.activityType,
            bandPosition: meta.bandPosition || 'wrist',
            firmwareVersion: meta.firmwareVersion || 'Unknown',
          },
          timestamp,
          metrics: {
            spo2: avgSpo2,
          },
          isValid: avgSpo2 !== null, // Valid if we have data
        };

        normalizedReadings.push(reading);
      }
    }

    return normalizedReadings;
  }

/**
 * Export function to match the pattern used by other parsers
 */
export async function parseAppleSpo2(
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
  return AppleSpo2Parser.parse(filePath, meta, startTime, endTime);
}
