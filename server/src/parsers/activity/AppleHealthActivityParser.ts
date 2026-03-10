import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Apple Health activity daily totals
 */
export interface IAppleHealthActivityDailyTotals {
  date: Date; // Date of the activity
  steps: number;
  distanceMeters: number;
  caloriesTotal: number;
  caloriesActive: number;
  caloriesBasal: number;
}

/**
 * Apple Health activity parse result
 */
export interface IAppleHealthActivityParseResult {
  dailyTotals: IAppleHealthActivityDailyTotals[];
  metadata?: {
    recordedAt?: string;
  };
}

/**
 * Intermediate record for aggregating Apple Health data
 */
interface ActivityDataPoint {
  type: string; // HKQuantityTypeIdentifierStepCount, HKQuantityTypeIdentifierDistanceWalkingRunning, etc.
  value: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  date: string; // YYYY-MM-DD format
}

/**
 * Apple Health Activity Parser
 * Parses export.xml to extract daily totals for steps, distance, and calories
 * Accepts all Apple Watch records, rejects iPhone records
 */
export class AppleHealthActivityParser {
  private xmlFilePath: string;

  constructor(xmlFilePath: string) {
    this.xmlFilePath = xmlFilePath;
  }

  /**
   * Main parse method
   * @param filePath - Path to the Apple Health export.xml file
   * @param sessionId - Session ID for reference (string)
   * @param userId - User ID for reference (string)
   * @param startDate - Start date for activity data extraction (optional)
   * @param endDate - End date for activity data extraction (optional)
   * @returns Parsed activity daily totals
   */
  static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IAppleHealthActivityParseResult> {
    const parser = new AppleHealthActivityParser(filePath);

    try {
      const dataPoints = await parser.parseActivityRecords(startDate, endDate);
      const dailyTotals = parser.aggregateToDailyTotals(dataPoints);

      console.log(`[AppleHealthActivityParser] Successfully parsed ${dailyTotals.length} daily records`);

      return {
        dailyTotals,
        metadata: {
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[AppleHealthActivityParser] Error parsing activity data:`, error);
      throw error;
    }
  }

  /**
   * Parse activity records from Apple Health XML
   * Extracts steps, distance, and calorie data from Apple Watch only (excludes iPhone)
   */
  private async parseActivityRecords(
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityDataPoint[]> {
    console.log(`[AppleHealthActivityParser] Parsing activity records from: ${this.xmlFilePath}`);
    console.log(`[AppleHealthActivityParser] 📱 Filtering: Accept Apple Watch records, Reject iPhone records`);
    if (startDate && endDate) {
      console.log(`[AppleHealthActivityParser] 📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }
    
    const dataPoints: ActivityDataPoint[] = [];
    
    const fileStream = fs.createReadStream(this.xmlFilePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;
    const relevantTypes = [
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierBasalEnergyBurned',
    ];

    for await (const line of rl) {
      lineNumber++;

      // Must contain sourceName to be a valid record
      if (!line.includes('sourceName=')) {
        continue;
      }

      // Skip if it's from iPhone
      if (line.includes("iPhone")) {
        continue;
      }

      // Only process Apple Watch records
      if (!line.includes("Apple") || !line.includes("Watch")) {
        continue;
      }

      // Look for <Record type="HKQuantityTypeIdentifier..." lines
      if (line.includes('<Record ') && line.includes('type=')) {
        for (const type of relevantTypes) {
          if (line.includes(type)) {
            try {
              const record = this.parseRecordLine(line, type);

              // Filter by date if provided (compare date portion only)
              if (startDate && endDate) {
                const targetDateStr = startDate.toISOString().split('T')[0];
                const recordDateStr = record.date; // Already in YYYY-MM-DD format
                if (recordDateStr !== targetDateStr) continue;
              }

              dataPoints.push(record);
            } catch (error) {
              // Silently skip invalid records
              continue;
            }
            break;
          }
        }
      }

      // Progress logging every 100k lines
      if (lineNumber % 100000 === 0) {
        console.log(`[AppleHealthActivityParser] Processed ${lineNumber} lines...`);
      }
    }

    console.log(`[AppleHealthActivityParser] ✅ Parsed ${dataPoints.length} activity data points from Apple Watch`);
    
    // Log breakdown by type
    const stepCount = dataPoints.filter(p => p.type === 'HKQuantityTypeIdentifierStepCount').length;
    const distanceCount = dataPoints.filter(p => p.type === 'HKQuantityTypeIdentifierDistanceWalkingRunning').length;
    const activeCalCount = dataPoints.filter(p => p.type === 'HKQuantityTypeIdentifierActiveEnergyBurned').length;
    const basalCalCount = dataPoints.filter(p => p.type === 'HKQuantityTypeIdentifierBasalEnergyBurned').length;
    
    console.log(`[AppleHealthActivityParser] 📊 Breakdown:`);
    console.log(`[AppleHealthActivityParser]    Steps: ${stepCount} records`);
    console.log(`[AppleHealthActivityParser]    Distance: ${distanceCount} records`);
    console.log(`[AppleHealthActivityParser]    Active Calories: ${activeCalCount} records`);
    console.log(`[AppleHealthActivityParser]    Basal Calories: ${basalCalCount} records`);
    
    return dataPoints;
  }

  /**
   * Parse a single Record line from the XML
   */
  private parseRecordLine(line: string, type: string): ActivityDataPoint {
    // Extract attributes using regex
    const valueMatch = line.match(/value="([^"]+)"/);
    const unitMatch = line.match(/unit="([^"]+)"/);
    const startDateMatch = line.match(/startDate="([^"]+)"/);
    const endDateMatch = line.match(/endDate="([^"]+)"/);

    if (!valueMatch || !startDateMatch || !endDateMatch) {
      throw new Error('Invalid record line');
    }

    const startDate = new Date(startDateMatch[1]);
    
    // Extract date in YYYY-MM-DD format from startDate
    const date = startDateMatch[1].split(' ')[0];

    return {
      type,
      value: parseFloat(valueMatch[1]),
      unit: unitMatch ? unitMatch[1] : '',
      startDate,
      endDate: new Date(endDateMatch[1]),
      date,
    };
  }

  /**
   * Aggregate data points to daily totals
   * Groups by date and sums values for each metric
   */
  private aggregateToDailyTotals(
    dataPoints: ActivityDataPoint[]
  ): IAppleHealthActivityDailyTotals[] {
    // Group by date
    const dailyData: Map<string, {
      steps: number;
      distanceMeters: number;
      caloriesActive: number;
      caloriesBasal: number;
    }> = new Map();

    for (const point of dataPoints) {
      // Use the date extracted from the record
      const dateKey = point.date;

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          steps: 0,
          distanceMeters: 0,
          caloriesActive: 0,
          caloriesBasal: 0,
        });
      }

      const dayData = dailyData.get(dateKey)!;

      // Aggregate based on type
      switch (point.type) {
        case 'HKQuantityTypeIdentifierStepCount':
          dayData.steps += point.value;
          break;
        case 'HKQuantityTypeIdentifierDistanceWalkingRunning':
          // Convert to meters if not already
          if (point.unit === 'km') {
            dayData.distanceMeters += point.value * 1000;
          } else if (point.unit === 'mi') {
            dayData.distanceMeters += point.value * 1609.34;
          } else {
            dayData.distanceMeters += point.value; // Assume meters
          }
          break;
        case 'HKQuantityTypeIdentifierActiveEnergyBurned':
          // Convert to kcal if not already
          if (point.unit === 'kJ') {
            dayData.caloriesActive += point.value * 0.239006; // kJ to kcal
          } else {
            dayData.caloriesActive += point.value; // Assume kcal
          }
          break;
        case 'HKQuantityTypeIdentifierBasalEnergyBurned':
          // Convert to kcal if not already
          if (point.unit === 'kJ') {
            dayData.caloriesBasal += point.value * 0.239006; // kJ to kcal
          } else {
            dayData.caloriesBasal += point.value; // Assume kcal
          }
          break;
      }
    }

    // Convert map to array
    const dailyTotals: IAppleHealthActivityDailyTotals[] = [];
    
    for (const [dateKey, data] of dailyData.entries()) {
      dailyTotals.push({
        date: this.parseDateKey(dateKey),
        steps: Math.round(data.steps),
        distanceMeters: Math.round(data.distanceMeters),
        caloriesTotal: Math.round(data.caloriesActive + data.caloriesBasal),
        caloriesActive: Math.round(data.caloriesActive),
        caloriesBasal: Math.round(data.caloriesBasal),
      });
    }

    // Sort by date
    dailyTotals.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Log daily summary (first 5 days)
    if (dailyTotals.length > 0) {
      console.log(`[AppleHealthActivityParser] 📅 Daily Summary (first 5 days):`);
      const firstFive = dailyTotals.slice(0, 5);
      firstFive.forEach(day => {
        const dateStr = day.date.toISOString().split('T')[0];
        console.log(`[AppleHealthActivityParser]    ${dateStr}:`);
        console.log(`[AppleHealthActivityParser]      Steps: ${day.steps} steps`);
        console.log(`[AppleHealthActivityParser]      Distance: ${(day.distanceMeters / 1000).toFixed(2)} km`);
        console.log(`[AppleHealthActivityParser]      Active Calories: ${day.caloriesActive.toFixed(2)} kcal`);
        console.log(`[AppleHealthActivityParser]      Basal Calories: ${day.caloriesBasal.toFixed(2)} kcal`);
        console.log(`[AppleHealthActivityParser]      Total Calories: ${day.caloriesTotal.toFixed(2)} kcal`);
      });
      if (dailyTotals.length > 5) {
        console.log(`[AppleHealthActivityParser]    ... and ${dailyTotals.length - 5} more days`);
      }
    }

    return dailyTotals;
  }

  /**
   * Parse date key back to Date object (at midnight UTC)
   */
  private parseDateKey(dateKey: string): Date {
    return new Date(dateKey + 'T00:00:00Z');
  }
}
