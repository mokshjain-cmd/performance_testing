import { Types } from "mongoose";
import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Luna activity daily totals
 */
export interface ILunaActivityDailyTotals {
  date: Date; // Date of the activity
  steps: number;
  distanceMeters: number;
  caloriesTotal: number | null; // Null if not provided
  caloriesActive: number | null;
  caloriesBasal: number | null; // Null if not provided (no longer calculated)
}

/**
 * Luna activity parse result
 */
export interface ILunaActivityParseResult {
  dailyTotals: ILunaActivityDailyTotals[];
  metadata?: {
    deviceId?: string;
    firmwareVersion?: string;
    recordedAt?: string;
  };
}

/**
 * Luna Activity Parser
 * Parses Luna activity data files to extract daily totals for steps, distance, and calories
 */
export class LunaActivityParser {
  /**
   * Parse Luna activity file
   * Expected format: CSV or text file with activity data
   * 
   * For now, this is a placeholder that assumes a simple format like:
   * Date,Steps,Distance(m),CaloriesTotal,CaloriesActive,CaloriesBasal
   * 2026-03-09,6828,5272,1515,420,1095
   * 
   * @param filePath - Path to the Luna activity file
   * @returns Parsed activity data
   */
  static async parseLunaActivityFile(
    filePath: string
  ): Promise<ILunaActivityParseResult> {
    console.log(`[LunaActivityParser] Parsing file: ${filePath}`);

    const dailyTotals: ILunaActivityDailyTotals[] = [];
    let metadata: any = {};

    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let isHeader = true;
      let lineNumber = 0;

      for await (const line of rl) {
        lineNumber++;
        
        // Skip empty lines
        if (!line.trim()) continue;

        // Skip header line
        if (isHeader) {
          isHeader = false;
          continue;
        }

        // Parse CSV line
        const parts = line.split(',').map(p => p.trim());
        
        // Expected format: Date,Steps,Distance(m),CaloriesTotal,CaloriesActive,CaloriesBasal
        if (parts.length >= 6) {
          try {
            const date = new Date(parts[0]);
            const steps = parseInt(parts[1], 10);
            const distanceMeters = parseFloat(parts[2]);
            const caloriesTotal = parseFloat(parts[3]);
            const caloriesActive = parseFloat(parts[4]);
            const caloriesBasal = parseFloat(parts[5]);

            // Validate data
            if (
              !isNaN(date.getTime()) &&
              !isNaN(steps) &&
              !isNaN(distanceMeters) &&
              !isNaN(caloriesTotal) &&
              !isNaN(caloriesActive) &&
              !isNaN(caloriesBasal)
            ) {
              dailyTotals.push({
                date,
                steps,
                distanceMeters,
                caloriesTotal,
                caloriesActive,
                caloriesBasal,
              });
            } else {
              console.warn(`[LunaActivityParser] Invalid data on line ${lineNumber}: ${line}`);
            }
          } catch (error) {
            console.warn(`[LunaActivityParser] Error parsing line ${lineNumber}: ${error}`);
          }
        } else {
          console.warn(`[LunaActivityParser] Unexpected format on line ${lineNumber}: ${line}`);
        }
      }

      console.log(`[LunaActivityParser] Successfully parsed ${dailyTotals.length} daily records`);

      return {
        dailyTotals,
        metadata,
      };
    } catch (error) {
      console.error(`[LunaActivityParser] Error parsing file: ${error}`);
      throw new Error(`Failed to parse Luna activity file: ${error}`);
    }
  }

  /**
   * Parse Luna activity file (Android format)
   * This may have a different format based on the Android app
   * @param filePath - Path to the Luna activity file
   * @param startDate - Optional start date to filter activity data
   * @param endDate - Optional end date to filter activity data
   */
  static async parseLunaActivityFileAndroid(
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ILunaActivityParseResult> {
    console.log(`[LunaActivityParser Android] Parsing file: ${filePath}`);
    if (startDate && endDate) {
      console.log(`[LunaActivityParser Android] 📅 Filtering by date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }
    
    const result = await this.parseLunaActivityFile(filePath);
    
    // Filter by date if specified
    if (startDate && endDate && result.dailyTotals) {
      const targetDateStr = startDate.toISOString().split('T')[0];
      result.dailyTotals = result.dailyTotals.filter(daily => {
        const dailyDateStr = daily.date.toISOString().split('T')[0];
        return dailyDateStr === targetDateStr;
      });
      console.log(`[LunaActivityParser Android] ✅ Filtered to ${result.dailyTotals.length} records for date ${targetDateStr}`);
    }
    
    return result;
  }

  /**
   * Parse Luna activity file (iOS format)
   * Parses ZHDRings (Luna iOS) Data from ZHDRingsLogs.txt
   * Extracts daily step, calorie, and distance data
   * @param filePath - Path to the Luna activity file
   * @param startDate - Optional start date to filter activity data
   * @param endDate - Optional end date to filter activity data
   */
  static async parseLunaActivityFileIOS(
    filePath: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ILunaActivityParseResult> {
    console.log(`[LunaActivityParser iOS] Parsing file: ${filePath}`);
    if (startDate && endDate) {
      console.log(`[LunaActivityParser iOS] 📅 Filtering by date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      const dailyEntries: any[] = [];
      let i = 0;
      
      // Extract daily data entries from the log file
      while (i < lines.length) {
        const line = lines[i];
        
        // Look for "Obtained daily data:" marker
        if (line.includes('<DailyData> Obtained daily data:')) {
          const entry: any = {
            timestamp: null,
            date: null,
            frequency: null,
            distance: null,
            steps: null,
            calories: null,
            dateStamp: null,
            todayCalorieData: null,
            todayOuraCalorieData: null,
            todaySportCalorieData: null,
            stepStr: [],
            distanceStr: [],
            caloriespStr: [],
            todayOuraCalorie: [],
            todaySportCalorie: []
          };
          
          // Extract timestamp from LOG line
          const timestampMatch = line.match(/LOG: ([\\d-]+\\s+[\\d:]+)/);
          if (timestampMatch) {
            entry.timestamp = timestampMatch[1];
          }
          
          // Parse the following lines until we hit the next LOG entry
          i++;
          while (i < lines.length && !lines[i].startsWith('LOG:')) {
            const dataLine = lines[i].trim();
            
            // Extract key-value pairs
            if (dataLine.startsWith('frequency:')) {
              entry.frequency = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('distance:')) {
              entry.distance = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('step:')) {
              entry.steps = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('calories:')) {
              entry.calories = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('dateStamp:')) {
              entry.dateStamp = parseInt(dataLine.split(':')[1].trim(), 10);
              // Convert Unix timestamp to date
              const date = new Date(entry.dateStamp * 1000);
              entry.date = date.toISOString().split('T')[0];
            } else if (dataLine.startsWith('todayCalorieData:')) {
              entry.todayCalorieData = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('todayOuraCalorieData:')) {
              entry.todayOuraCalorieData = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('todaySportCalorieData:')) {
              entry.todaySportCalorieData = parseInt(dataLine.split(':')[1].trim(), 10);
            } else if (dataLine.startsWith('stepStr:')) {
              entry.stepStr = this.parseArrayString(dataLine.split('stepStr:')[1]);
            } else if (dataLine.startsWith('distanceStr:')) {
              entry.distanceStr = this.parseArrayString(dataLine.split('distanceStr:')[1]);
            } else if (dataLine.startsWith('caloriespStr:')) {
              entry.caloriespStr = this.parseArrayString(dataLine.split('caloriespStr:')[1]);
            } else if (dataLine.startsWith('todayOuraCalorie:')) {
              entry.todayOuraCalorie = this.parseArrayString(dataLine.split('todayOuraCalorie:')[1]);
            } else if (dataLine.startsWith('todaySportCalorie:')) {
              entry.todaySportCalorie = this.parseArrayString(dataLine.split('todaySportCalorie:')[1]);
            }
            
            i++;
          }
          
          // Only add if we have complete data
          if (entry.date && entry.steps !== null) {
            dailyEntries.push(entry);
          }
          
          continue;
        }
        
        i++;
      }
      
      console.log(`[LunaActivityParser iOS] Extracted ${dailyEntries.length} daily entries`);
      
      // Filter by target date if specified
      let filteredEntries = dailyEntries;
      if (startDate && endDate) {
        const targetDateStr = startDate.toISOString().split('T')[0];
        filteredEntries = dailyEntries.filter(entry => entry.date === targetDateStr);
        console.log(`[LunaActivityParser iOS] 📅 Filtered to ${filteredEntries.length} entries for date ${targetDateStr}`);
      }
      
      // Group by date and take the last entry for each date (most recent update)
      const dateMap = new Map<string, any>();
      for (const entry of filteredEntries) {
        dateMap.set(entry.date, entry);
      }
      
      // Convert to our format
      const dailyTotals: ILunaActivityDailyTotals[] = [];
      
      for (const [dateStr, entry] of dateMap.entries()) {
        const totalCal = entry.calories > 0 ? entry.calories : null;
        const activeCal = entry.todaySportCalorieData > 0 ? entry.todaySportCalorieData : null;
        const basalCal = null; // Luna logs don't provide basal directly - don't calculate
        
        dailyTotals.push({
          date: new Date(dateStr),
          steps: entry.steps || 0,
          distanceMeters: entry.distance || 0,
          caloriesTotal: totalCal,
          caloriesActive: activeCal,
          caloriesBasal: basalCal,
        });
      }
      
      console.log(`[LunaActivityParser iOS] Successfully parsed ${dailyTotals.length} unique daily records`);
      
      return {
        dailyTotals,
        metadata: {
          recordedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error(`[LunaActivityParser iOS] Error parsing file: ${error}`);
      throw new Error(`Failed to parse Luna iOS activity file: ${error}`);
    }
  }
  
  /**
   * Helper: Parse a comma-separated string into an array of numbers
   */
  private static parseArrayString(str: string): number[] {
    try {
      return str.split(',').map(v => parseInt(v.trim(), 10)).filter(v => !isNaN(v));
    } catch (error) {
      return [];
    }
  }
}
