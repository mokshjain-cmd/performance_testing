/**
 * Apple HR Parser
 * Parses Apple Watch/Health HR data from export.xml
 * Extracts heart rate records and buckets them into time intervals
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
    heartRate: number | null;
  };
  isValid: boolean;
}

interface HRRecord {
  timestamp: Date;
  value: number;
  motionContext?: number;
  source: string;
}

interface Bucket {
  [key: string]: number[]; // key: "HH:MM", value: array of HR values
}

/**
 * Parse Apple HR data from export.xml file
 * @param filePath - Path to the Apple Health export.xml file
 * @param meta - Session metadata (sessionId, userId, firmwareVersion, bandPosition, activityType)
 * @param startTime - Session start time for filtering
 * @param endTime - Session end time for filtering
 * @returns Promise<NormalizedReadingInput[]> - Array of normalized readings
 */
export async function parseAppleHR(
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
  console.log('🍎 Apple Watch HR Parser');
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
    console.log('🍎 NOTE: Timestamps are parsed AS-IS and stored as UTC');
    console.log('🍎 Apple Health: "2026-03-19 08:15:42 +0530" → Stored as: "2026-03-19T08:15:42.000Z"');
    console.log('🍎 (Timezone offset +0530 is IGNORED - we use the clock time as-is)');
    const records = await extractAppleWatchHRRecordsStreaming(filePath, targetDateStr, startTime, endTime);
    
    if (records.length === 0) {
      console.log('🍎 ⚠️ No Apple Watch heart rate records found in the specified time range');
      return [];
    }

    console.log(`🍎 Found ${records.length} heart rate records`);

    // Bucket the data into 5-minute intervals
    const buckets = bucketData(records, 5);
    console.log(`🍎 Data bucketed into ${Object.keys(buckets).length} non-empty intervals`);

    // Create normalized readings
    const normalizedReadings = createNormalizedReadings(
      buckets,
      startTime,
      endTime,
      meta
    );

    console.log(`🍎 ✅ Generated ${normalizedReadings.length} heart rate readings`);
    
    if (normalizedReadings.length > 0) {
      const validReadings = normalizedReadings.filter(r => r.isValid);
      const hrValues = validReadings
        .map(r => r.metrics.heartRate)
        .filter((hr): hr is number => hr !== null);
      
      if (hrValues.length > 0) {
        console.log(`🍎 Summary:`);
        console.log(`🍎   - Valid readings: ${validReadings.length}`);
        console.log(`🍎   - Invalid readings: ${normalizedReadings.length - validReadings.length}`);
        console.log(`🍎   - HR range: ${Math.min(...hrValues)} - ${Math.max(...hrValues)} bpm`);
        console.log(`🍎   - HR average: ${(hrValues.reduce((a, b) => a + b, 0) / hrValues.length).toFixed(1)} bpm`);
        console.log(`🍎   - Coverage: ${validReadings.length}/${normalizedReadings.length} buckets (${(validReadings.length / normalizedReadings.length * 100).toFixed(1)}%)`);
      }
    }

    console.log('🍎 ========================================\n');

    return normalizedReadings;

  } catch (error) {
    console.error('❌ Error parsing Apple HR data:', error);
    throw new Error(
      `Failed to parse Apple HR data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract Apple Watch HR records from XML file using streaming (for large files)
 * Uses line-by-line reading to avoid memory issues
 */
async function extractAppleWatchHRRecordsStreaming(
  filePath: string,
  targetDate: string,
  startTime: Date,
  endTime: Date
): Promise<HRRecord[]> {
  return new Promise((resolve, reject) => {
    const records: HRRecord[] = [];
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

      // Look for Record tags with heart rate type
      if (line.includes('<Record') && line.includes('type="HKQuantityTypeIdentifierHeartRate"')) {
        recordCount++;

        // Extract attributes using regex
        const typeMatch = line.match(/type="([^"]+)"/);
        const sourceNameMatch = line.match(/sourceName="([^"]+)"/);
        const startDateMatch = line.match(/startDate="([^"]+)"/);
        const valueMatch = line.match(/value="([^"]+)"/);
        const motionContextMatch = line.match(/HKMetadataKeyHeartRateMotionContext="([^"]+)"/);

        if (typeMatch && sourceNameMatch && startDateMatch && valueMatch) {
          const sourceName = sourceNameMatch[1];
          const startDateStr = startDateMatch[1];
          const valueStr = valueMatch[1];
          const motionContext = motionContextMatch ? parseInt(motionContextMatch[1]) : undefined;

          // Normalize source name to handle non-breaking spaces
          const normalizedSource = sourceName.replace(/\xa0/g, ' ').replace(/\u00A0/g, ' ');
          const isAppleWatch = normalizedSource.includes('Apple Watch');

          if (isAppleWatch) {
            // Parse datetime (format: "2026-03-02 14:18:42 +0530" or "2026-03-02 14:18:42 -0800")
            // Extract just the date and time portion (ignoring timezone)
            // Add 'Z' to force UTC interpretation (so 08:15:42 stays as 08:15:42 UTC, not converted)
            const dateTimePart = startDateStr.substring(0, 19); // "2026-03-02 14:18:42"
            const timestamp = new Date(dateTimePart.replace(' ', 'T') + 'Z'); // Force UTC

            // Check if this record is within our time range
            if (timestamp >= startTime && timestamp <= endTime) {
              matchedRecordCount++;

              const hrValue = parseFloat(valueStr);

              // Debug first few in-range records to show timestamp parsing
              if (matchedRecordCount <= 3) {
                console.log(`🍎 DEBUG In-Range Record ${matchedRecordCount}:`);
                console.log(`  Raw date string: ${startDateStr}`);
                console.log(`  Extracted: ${dateTimePart}`);
                console.log(`  Parsed timestamp (UTC): ${timestamp.toISOString()}`);
                console.log(`  HR value: ${hrValue}`);
              }

              records.push({
                timestamp,
                value: hrValue,
                motionContext,
                source: sourceName
              });
            }
          }
        }
      }

      // Log progress every 100,000 lines
      if (lineCount % 100000 === 0) {
        console.log(`🍎 Processed ${lineCount} lines... (${recordCount} HR records, ${matchedRecordCount} in range)`);
      }
    });

    rl.on('close', () => {
      console.log(`🍎 XML streaming complete. Scanned ${lineCount} lines`);
      console.log(`🍎 Found ${recordCount} total HR records`);
      console.log(`🍎 Matched ${matchedRecordCount} records in time range`);
      resolve(records);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Extract Apple Watch HR records from parsed XML data (legacy method - not used)
 * Extracts all records for the date from startTime, then filters by time range
 */
function extractAppleWatchHRRecords(
  xmlData: any,
  startTime: Date,
  endTime: Date
): HRRecord[] {
  const records: HRRecord[] = [];
  
  // Define the target date (from startTime) for initial extraction
  const targetDate = new Date(startTime);
  const targetDateStr = targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Navigate to HealthData > Record array
  const healthData = xmlData?.HealthData;
  if (!healthData) {
    console.log('🍎 ⚠️ No HealthData element found in XML');
    return records;
  }

  let recordsArray = healthData.Record;
  if (!recordsArray) {
    console.log('🍎 ⚠️ No Record elements found in XML');
    return records;
  }

  // Ensure it's an array
  if (!Array.isArray(recordsArray)) {
    recordsArray = [recordsArray];
  }

  let processedCount = 0;
  let hrTypeCount = 0;
  let appleWatchCount = 0;

  for (const record of recordsArray) {
    processedCount++;
    
    if (processedCount % 10000 === 0) {
      console.log(`🍎 Processed ${processedCount} records...`);
    }

    // Check if it's a heart rate record
    const recordType = record.type;
    if (recordType !== 'HKQuantityTypeIdentifierHeartRate') {
      continue;
    }
    hrTypeCount++;

    // Check if it's from Apple Watch
    const sourceName = record.sourceName || '';
    const normalizedSource = sourceName.replace(/\xa0/g, ' '); // Handle non-breaking spaces
    const isAppleWatch = normalizedSource.includes('Apple Watch');
    
    if (!isAppleWatch) {
      continue;
    }
    appleWatchCount++;

    // Parse timestamp
    const startDateStr = record.startDate;
    if (!startDateStr) continue;

    // Parse datetime (format: "2026-03-02 14:18:42 +0530")
    const timestamp = parseDateString(startDateStr);
    if (!timestamp) continue;
    
    // First check: Is this record from our target date?
    const recordDateStr = timestamp.toISOString().split('T')[0];
    if (recordDateStr !== targetDateStr) {
      continue;
    }

    // Second check: Filter by actual time range within that date
    if (timestamp < startTime || timestamp > endTime) {
      continue;
    }

    // Filter by time range
    if (timestamp < startTime || timestamp > endTime) {
      continue;
    }

    // Parse HR value
    const valueStr = record.value;
    if (!valueStr) continue;
    
    const value = parseFloat(valueStr);
    if (isNaN(value)) continue;

    // Extract motion context from metadata
    let motionContext: number | undefined;
    const metadata = record.MetadataEntry;
    if (metadata) {
      const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
      const motionEntry = metadataArray.find(
        (entry: any) => entry.key === 'HKMetadataKeyHeartRateMotionContext'
      );
      if (motionEntry && motionEntry.value) {
        motionContext = parseInt(motionEntry.value);
      }
    }

    records.push({
      timestamp,
      value,
      motionContext,
      source: sourceName,
    });
  }

  console.log(`🍎 Processed ${processedCount} total records`);
  console.log(`🍎 Found ${hrTypeCount} heart rate records`);
  console.log(`🍎 Found ${appleWatchCount} Apple Watch records`);
  console.log(`🍎 Filtered to ${records.length} records in time range`);

  return records;
}

/**
 * Parse date string from Apple Health export
 * Format: "2026-03-02 14:18:42 +0530"
 */
function parseDateString(dateStr: string): Date | null {
  try {
    // Extract the datetime part (ignore timezone for now)
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    if (!match) return null;
    
    const dateTimeStr = match[1];
    const timestamp = new Date(dateTimeStr.replace(' ', 'T') + 'Z');
    
    if (isNaN(timestamp.getTime())) return null;
    
    return timestamp;
  } catch {
    return null;
  }
}

/**
 * Bucket heart rate records into time intervals
 */
function bucketData(records: HRRecord[], bucketMinutes: number): Bucket {
  const buckets: Bucket = {};

  console.log(`\n🍎 DEBUG: Bucketing ${records.length} records into ${bucketMinutes}-minute intervals...`);
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const timestamp = record.timestamp;
    const value = record.value;

    // Calculate bucket start time
    const totalMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
    const bucketStartMinute = Math.floor(totalMinutes / bucketMinutes) * bucketMinutes;
    const bucketHour = Math.floor(bucketStartMinute / 60);
    const bucketMin = bucketStartMinute % 60;

    // Create bucket key in HH:MM format
    const dateKey = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeKey = `${String(bucketHour).padStart(2, '0')}:${String(bucketMin).padStart(2, '0')}`;
    const bucketKey = `${dateKey} ${timeKey}`;

    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(value);

    // Debug first 5 records to show bucketing logic
    if (i < 5) {
      console.log(`  Record ${i + 1}: ${timestamp.toISOString()} (HR: ${value}) → Bucket: ${bucketKey}`);
    }
  }

  // Show sample of buckets with their values
  console.log(`\n🍎 DEBUG: Sample of buckets created:`);
  const bucketKeys = Object.keys(buckets).sort().slice(0, 10);
  for (const key of bucketKeys) {
    const values = buckets[key];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    console.log(`  ${key}: ${values.length} readings, avg HR: ${avg.toFixed(1)} (values: [${values.slice(0, 5).join(', ')}${values.length > 5 ? '...' : ''}])`);
  }

  return buckets;
}

/**
 * Create normalized readings from bucketed data
 */
function createNormalizedReadings(
  buckets: Bucket,
  startTime: Date,
  endTime: Date,
  meta: {
    sessionId: any;
    userId: any;
    firmwareVersion?: string;
    bandPosition?: string;
    activityType: string;
  }
): NormalizedReadingInput[] {
  const normalizedReadings: NormalizedReadingInput[] = [];

  // Iterate through time range in 5-minute increments
  const currentTime = new Date(startTime);
  currentTime.setMinutes(Math.floor(currentTime.getMinutes() / 5) * 5, 0, 0); // Round down to nearest 5 minutes

  console.log(`\n🍎 DEBUG: Creating normalized readings from ${startTime.toISOString()} to ${endTime.toISOString()}`);
  console.log(`🍎 Starting at: ${currentTime.toISOString()}`);
  
  let readingCount = 0;
  while (currentTime <= endTime) {
    const dateKey = currentTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const timeKey = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const bucketKey = `${dateKey} ${timeKey}`;

    // Get heart rate values for this bucket
    const hrValues = buckets[bucketKey] || [];

    // Calculate average if values exist, otherwise null
    const avgHr = hrValues.length > 0
      ? Math.round((hrValues.reduce((a, b) => a + b, 0) / hrValues.length) * 100) / 100
      : null;

    // Debug first 10 readings and specifically 00:05
    if (readingCount < 10 || timeKey === '00:05') {
      console.log(`  Timestamp: ${currentTime.toISOString()} (${timeKey}) → Bucket: ${bucketKey}, ${hrValues.length} values, Avg HR: ${avgHr !== null ? avgHr.toFixed(1) : 'null'}`);
      if (hrValues.length > 0) {
        console.log(`    Raw values: [${hrValues.join(', ')}]`);
      }
    }

    // Create normalized reading
    const reading: NormalizedReadingInput = {
      meta: {
        sessionId: meta.sessionId,
        userId: meta.userId,
        deviceType: 'apple',
        activityType: meta.activityType,
        bandPosition: meta.bandPosition || 'wrist',
        firmwareVersion: meta.firmwareVersion,
      },
      timestamp: new Date(currentTime),
      metrics: {
        heartRate: avgHr,
      },
      isValid: avgHr !== null,
    };

    normalizedReadings.push(reading);
    readingCount++;

    // Move to next 5-minute bucket
    currentTime.setMinutes(currentTime.getMinutes() + 5);
  }

  console.log(`🍎 Total normalized readings created: ${normalizedReadings.length}`);

  return normalizedReadings;
}
