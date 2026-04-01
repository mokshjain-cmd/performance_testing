import { Types } from "mongoose";
import * as fs from 'fs';
import * as readline from 'readline';
import type {
  ILunaActivityDailyTotals,
  ILunaActivityParseResult,
} from './LunaActivityParser';

/**
 * Parsed Daily Bean from Falcon Luna app logs
 */
interface ParsedDailyBean {
  date: string; // Format: '2026-03-19 00:00:00'
  stepsData: number[]; // 24 hourly values
  distanceData: number[]; // 24 hourly values
  calorieData: number[]; // 24 hourly values
  todayCalorieData: number;
  todaySportCalorieData: number;
}

/**
 * Falcon Luna Activity Parser
 * Parses activity data from Falcon Luna Ring app logs
 * Extracts onDailyData entries containing steps, distance, and calorie information
 */
export class FalconLunaActivityParser {
  /**
   * Parse Falcon Luna activity log file
   * Format: App logs containing "LUNA-> onDailyData : DailyBean{...}" entries
   * 
   * @param filePath - Path to the Falcon Luna activity log file
   * @param startDate - Optional start date to filter activity data (user-specified session date)
   * @param endDate - Optional end date to filter activity data
   * @returns Parsed activity data matching Luna parser output format
   */
  static async parseFalconLunaActivityFile(
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ILunaActivityParseResult> {
    console.log(`[FalconLunaActivityParser] Parsing file: ${filePath}`);
    if (startDate && endDate) {
      console.log(`[FalconLunaActivityParser] 📅 Filtering by date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }

    const dailyTotals: ILunaActivityDailyTotals[] = [];
    const metadata: any = {};

    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const dailyRecordsByDate = new Map<string, ParsedDailyBean>();

      for await (const line of rl) {
        // Look for onDailyData lines
        if (!line.includes('LUNA-> onDailyData : DailyBean{')) {
          continue;
        }

        try {
          const record = this.extractDailyBean(line);
          if (record) {
            const dateKey = record.date.split(' ')[0]; // Extract date part only (YYYY-MM-DD)
            
            // Store only the latest record for each date
            // (app syncs multiple times, latest has most accurate data)
            dailyRecordsByDate.set(dateKey, record);
          }
        } catch (error) {
          // Silently skip parse errors for individual lines
          console.warn(`[FalconLunaActivityParser] Failed to parse line: ${error}`);
        }
      }

      console.log(`[FalconLunaActivityParser] Found ${dailyRecordsByDate.size} unique dates in app log`);

      // Convert to daily totals format
      for (const [dateKey, record] of dailyRecordsByDate.entries()) {
        const dailyTotal = this.convertToDailyTotals(record);
        
        // Filter by date if specified
        if (startDate && endDate) {
          const targetDateStr = startDate.toISOString().split('T')[0];
          const recordDateStr = dailyTotal.date.toISOString().split('T')[0];
          
          if (recordDateStr === targetDateStr) {
            dailyTotals.push(dailyTotal);
          }
        } else {
          dailyTotals.push(dailyTotal);
        }
      }

      if (startDate && endDate) {
        const targetDateStr = startDate.toISOString().split('T')[0];
        console.log(`[FalconLunaActivityParser] ✅ Filtered to ${dailyTotals.length} records for date ${targetDateStr}`);
      }

      console.log(`[FalconLunaActivityParser] Successfully parsed ${dailyTotals.length} daily records`);

      return {
        dailyTotals,
        metadata,
      };
    } catch (error) {
      console.error(`[FalconLunaActivityParser] Error parsing file: ${error}`);
      throw new Error(`Failed to parse Falcon Luna activity file: ${error}`);
    }
  }

  /**
   * Extract DailyBean data from an app log line
   * Format: "2026-03-19 14:40:48.843 I/X-LOG: LUNA-> onDailyData : DailyBean{...}"
   */
  private static extractDailyBean(line: string): ParsedDailyBean | null {
    try {
      // Extract the date field from the bean
      const dateMatch = line.match(/date='([^']+)'/);
      if (!dateMatch) return null;
      const date = dateMatch[1];

      // Extract stepsData array
      const stepsMatch = line.match(/stepsData=\[([^\]]+)\]/);
      const stepsData = stepsMatch
        ? stepsMatch[1].split(',').map(v => parseInt(v.trim(), 10))
        : [];

      // Extract distanceData array
      const distanceMatch = line.match(/distanceData=\[([^\]]+)\]/);
      const distanceData = distanceMatch
        ? distanceMatch[1].split(',').map(v => parseInt(v.trim(), 10))
        : [];

      // Extract calorieData array
      const calorieMatch = line.match(/calorieData=\[([^\]]+)\]/);
      const calorieData = calorieMatch
        ? calorieMatch[1].split(',').map(v => parseInt(v.trim(), 10))
        : [];

      // Extract todayCalorieData
      const todayCalMatch = line.match(/todayCalorieData=(\d+)/);
      const todayCalorieData = todayCalMatch ? parseInt(todayCalMatch[1], 10) : 0;

      // Extract todaySportCalorieData (active calories)
      const sportCalMatch = line.match(/todaySportCalorieData=(\d+)/);
      const todaySportCalorieData = sportCalMatch ? parseInt(sportCalMatch[1], 10) : 0;

      return {
        date,
        stepsData,
        distanceData,
        calorieData,
        todayCalorieData,
        todaySportCalorieData,
      };
    } catch (error) {
      console.warn(`[FalconLunaActivityParser] Error extracting DailyBean: ${error}`);
      return null;
    }
  }

  /**
   * Convert parsed DailyBean to ILunaActivityDailyTotals format
   */
  private static convertToDailyTotals(record: ParsedDailyBean): ILunaActivityDailyTotals {
    // Sum hourly steps
    const totalSteps = record.stepsData.reduce((sum, val) => sum + val, 0);

    // Sum hourly distance (values are in meters from the ring)
    const totalDistanceMeters = record.distanceData.reduce((sum, val) => sum + val, 0);

    // Use todayCalorieData for total calories (more accurate than summing hourly)
    const caloriesTotal = record.todayCalorieData > 0 ? record.todayCalorieData : null;

    // Use todaySportCalorieData for active calories
    const caloriesActive = record.todaySportCalorieData > 0 ? record.todaySportCalorieData : null;

    // Don't calculate basal calories - keep as null if not provided directly
    const caloriesBasal = null; // Luna logs don't provide basal directly

    // Parse date string to Date object (as UTC to avoid timezone shifts)
    // Format: '2026-03-20 00:00:00' → Parse as UTC
    const dateParts = record.date.split(' ')[0].split('-'); // ['2026', '03', '20']
    const dateObj = new Date(Date.UTC(
      parseInt(dateParts[0], 10), // year
      parseInt(dateParts[1], 10) - 1, // month (0-indexed)
      parseInt(dateParts[2], 10) // day
    ));

    return {
      date: dateObj,
      steps: totalSteps,
      distanceMeters: totalDistanceMeters,
      caloriesTotal,
      caloriesActive,
      caloriesBasal,
    };
  }
}
