/**
 * Apple Health Skin Temperature Parser
 * Parses Apple Watch sleeping wrist temperature data from export.xml
 * 
 * Apple Health provides ONE temperature reading per sleep session:
 * - The average wrist temperature during the entire sleep period
 * - This is NOT a continuous measurement like Luna
 * 
 * Record format in export.xml:
 * <Record type="HKQuantityTypeIdentifierAppleSleepingWristTemperature"
 *   sourceName="Jagatheeswaran's Apple Watch"
 *   startDate="2024-09-29 01:00:00 +0800"
 *   endDate="2024-09-29 09:01:35 +0800"
 *   value="34.9049"
 *   unit="degC"/>
 * 
 * IMPORTANT: For skin temp comparison with Luna, we can ONLY calculate BIAS
 * (not MAE, RMSE, or Pearson R) because Apple provides a single value per night.
 */

import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Apple sleeping wrist temperature record
 */
export interface IAppleSkinTempRecord {
  /** Sleep period start time */
  startTime: Date;
  /** Sleep period end time */
  endTime: Date;
  /** Duration of sleep in seconds */
  durationSec: number;
  /** Average wrist temperature during sleep (Celsius) */
  temperatureCelsius: number;
  /** Original unit from Apple (should be 'degC') */
  unit: string;
  /** Source device name */
  sourceName: string;
  /** Date string for easy matching (YYYY-MM-DD) */
  dateKey: string;
}

/**
 * Apple Health Skin Temperature Parser
 * Uses streaming to handle large export.xml files
 */
export class AppleHealthSkinTempParser {
  
  /**
   * Parse all sleeping wrist temperature records from Apple Health export.xml
   * @param filePath Path to export.xml
   * @param filterStartDate Optional start date filter (YYYY-MM-DD or Date)
   * @param filterEndDate Optional end date filter (YYYY-MM-DD or Date)
   * @returns Array of parsed temperature records (one per sleep session)
   */
  static async parseSkinTempRecords(
    filePath: string,
    filterStartDate?: Date | string,
    filterEndDate?: Date | string
  ): Promise<IAppleSkinTempRecord[]> {
    console.log(`[AppleHealthSkinTempParser] 🌡️ Parsing file: ${filePath}`);
    
    // Convert filter dates to Date objects if strings
    let startFilter: Date | undefined;
    let endFilter: Date | undefined;
    
    if (filterStartDate) {
      startFilter = typeof filterStartDate === 'string' 
        ? new Date(filterStartDate) 
        : filterStartDate;
      console.log(`[AppleHealthSkinTempParser] Filter start: ${startFilter.toISOString()}`);
    }
    if (filterEndDate) {
      endFilter = typeof filterEndDate === 'string' 
        ? new Date(filterEndDate) 
        : filterEndDate;
      console.log(`[AppleHealthSkinTempParser] Filter end: ${endFilter.toISOString()}`);
    }
    
    const records: IAppleSkinTempRecord[] = [];
    
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      let lineCount = 0;
      let recordCount = 0;
      
      rl.on('line', (line: string) => {
        lineCount++;
        
        // Look for AppleSleepingWristTemperature records
        if (!line.includes('HKQuantityTypeIdentifierAppleSleepingWristTemperature')) {
          return;
        }
        
        try {
          const record = this.parseRecordLine(line);
          
          if (record) {
            // Apply date filters
            if (startFilter && record.startTime < startFilter) {
              return;
            }
            if (endFilter && record.endTime > endFilter) {
              return;
            }
            
            records.push(record);
            recordCount++;
            
            console.log(`[AppleHealthSkinTempParser]   Found: ${record.dateKey}, ` +
              `temp: ${record.temperatureCelsius.toFixed(2)}°C, ` +
              `sleep: ${(record.durationSec / 3600).toFixed(1)}hrs`);
          }
        } catch (parseError) {
          // Skip malformed records
          console.warn(`[AppleHealthSkinTempParser] ⚠️ Skipping malformed record at line ${lineCount}`);
        }
        
        // Progress logging for large files
        if (lineCount % 500000 === 0) {
          console.log(`[AppleHealthSkinTempParser] Processed ${lineCount} lines... (${recordCount} temp records found)`);
        }
      });
      
      rl.on('close', () => {
        console.log(`[AppleHealthSkinTempParser] ✅ Parsing complete:`);
        console.log(`   - Total lines processed: ${lineCount}`);
        console.log(`   - Skin temp records found: ${records.length}`);
        
        if (records.length > 0) {
          const temps = records.map(r => r.temperatureCelsius);
          console.log(`   - Temp range: ${Math.min(...temps).toFixed(2)}°C to ${Math.max(...temps).toFixed(2)}°C`);
          console.log(`   - Avg temp: ${(temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)}°C`);
        }
        
        resolve(records);
      });
      
      rl.on('error', (err) => {
        console.error(`[AppleHealthSkinTempParser] ❌ Error reading file:`, err);
        reject(err);
      });
    });
  }
  
  /**
   * Parse a single Record line containing skin temperature data
   */
  private static parseRecordLine(line: string): IAppleSkinTempRecord | null {
    try {
      // Extract attributes using regex
      const startDateMatch = line.match(/startDate="([^"]+)"/);
      const endDateMatch = line.match(/endDate="([^"]+)"/);
      const valueMatch = line.match(/value="([^"]+)"/);
      const unitMatch = line.match(/unit="([^"]+)"/);
      const sourceNameMatch = line.match(/sourceName="([^"]+)"/);
      
      if (!startDateMatch || !endDateMatch || !valueMatch) {
        return null;
      }
      
      // Parse timestamps
      // Format: "2024-09-29 01:00:00 +0800"
      // We extract just the datetime part and treat it as local time (IST)
      const startTime = this.parseAppleTimestamp(startDateMatch[1]);
      const endTime = this.parseAppleTimestamp(endDateMatch[1]);
      
      if (!startTime || !endTime) {
        return null;
      }
      
      // Parse temperature value
      const temperatureCelsius = parseFloat(valueMatch[1]);
      if (isNaN(temperatureCelsius)) {
        return null;
      }
      
      // Calculate duration
      const durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Generate date key (YYYY-MM-DD of start date)
      const dateKey = startTime.toISOString().split('T')[0];
      
      return {
        startTime,
        endTime,
        durationSec,
        temperatureCelsius,
        unit: unitMatch ? unitMatch[1] : 'degC',
        sourceName: sourceNameMatch ? sourceNameMatch[1] : 'Apple Watch',
        dateKey,
      };
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Parse Apple Health timestamp format
   * Format: "2024-09-29 01:00:00 +0800"
   * We ignore the timezone offset and treat the time as-is (store as UTC representation of local time)
   */
  private static parseAppleTimestamp(timestampStr: string): Date | null {
    try {
      // Extract datetime part (ignore timezone offset)
      // "2024-09-29 01:00:00 +0800" → "2024-09-29 01:00:00"
      const dateTimePart = timestampStr.substring(0, 19);
      
      // Parse as ISO format
      const [datePart, timePart] = dateTimePart.split(' ');
      const isoStr = `${datePart}T${timePart}.000Z`;
      
      return new Date(isoStr);
    } catch {
      return null;
    }
  }
  
  /**
   * Find the Apple skin temp record that overlaps with a given session time window
   * @param records Array of Apple skin temp records
   * @param sessionStartTime Session start time
   * @param sessionEndTime Session end time
   * @returns Matching record or undefined
   */
  static findMatchingRecord(
    records: IAppleSkinTempRecord[],
    sessionStartTime: Date,
    sessionEndTime: Date
  ): IAppleSkinTempRecord | undefined {
    
    const sessionStart = sessionStartTime.getTime();
    const sessionEnd = sessionEndTime.getTime();
    
    // Find record with best overlap
    let bestMatch: IAppleSkinTempRecord | undefined;
    let bestOverlap = 0;
    
    for (const record of records) {
      const recordStart = record.startTime.getTime();
      const recordEnd = record.endTime.getTime();
      
      // Calculate overlap
      const overlapStart = Math.max(sessionStart, recordStart);
      const overlapEnd = Math.min(sessionEnd, recordEnd);
      const overlapMs = Math.max(0, overlapEnd - overlapStart);
      
      if (overlapMs > bestOverlap) {
        bestOverlap = overlapMs;
        bestMatch = record;
      }
    }
    
    if (bestMatch) {
      const overlapHours = bestOverlap / (1000 * 60 * 60);
      console.log(`[AppleHealthSkinTempParser] Matched record: ${bestMatch.dateKey}, ` +
        `overlap: ${overlapHours.toFixed(1)} hours`);
    }
    
    return bestMatch;
  }
  
  /**
   * Find record by date (YYYY-MM-DD)
   * @param records Array of Apple skin temp records
   * @param dateKey Date string in YYYY-MM-DD format
   * @returns Matching record or undefined
   */
  static findRecordByDate(
    records: IAppleSkinTempRecord[],
    dateKey: string
  ): IAppleSkinTempRecord | undefined {
    return records.find(r => r.dateKey === dateKey);
  }
}
