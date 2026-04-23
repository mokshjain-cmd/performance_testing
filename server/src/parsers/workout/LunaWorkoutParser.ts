import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout data from Luna Android app log
 */
export interface IParsedWorkout {
  workoutId: string; // recordPointDataId
  sportType: number;
  startTime: Date;
  endTime: Date;
  durationSec: number;
  
  // Summary from DevSportInfoBean
  summary: {
    avgHeart: number;
    maxHeart: number;
    minHeart: number;
    calories: number;
    steps: number;
    distance: number;
    avgPace: number;
    fastPace: number;
    slowestPace: number;
    avgSpeed: number;
    fastSpeed: number;
    avgStepSpeed: number;
    maxStepSpeed: number;
    trainingEffect: number;
    trainingLoad: number;
    vo2max: number;
    recoveryTime: number;
    heartWarmUp: number;
    heartFatBurning: number;
    heartAerobic: number;
    heartAnaerobic: number;
  };
  
  // Per-second readings from ringPointData
  readings: Array<{
    timestamp: Date;
    heartRate: number;
    heartRateConfidence: number;
    exerciseIntensity: number;
  }>;
}

/**
 * Luna Workout Parser for Android app logs
 * Extracts RECORD_WORKOUT entries with DevSportInfoBean data
 */
export class LunaWorkoutParser {
  
  /**
   * Parse all workouts from a Luna Android app log file
   * @param filePath Path to the app log file
   * @param targetDate Date to filter workouts (only workouts that start on this date)
   * @returns Array of parsed workouts
   */
  static async parseWorkoutsFromLog(
    filePath: string,
    targetDate: Date
  ): Promise<IParsedWorkout[]> {
    console.log(`[LunaWorkoutParser] Parsing file: ${filePath}`);
    console.log(`[LunaWorkoutParser] Target date: ${targetDate.toISOString().split('T')[0]}`);
    
    const workoutsMap = new Map<string, IParsedWorkout>();
    
    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      for await (const line of rl) {
        // Look for RECORD_WORKOUT received workout lines specifically
        if (!line.includes('RECORD_WORKOUT received workout DevSportInfoBean{')) {
          continue;
        }
        
        try {
          const workout = this.parseWorkoutLine(line);
          if (workout) {
            // Filter by target date
            const workoutDateStr = workout.startTime.toISOString().split('T')[0];
            const targetDateStr = targetDate.toISOString().split('T')[0];
            
            if (workoutDateStr === targetDateStr) {
              // Store by workoutId - later entries override earlier (deduplication)
              workoutsMap.set(workout.workoutId, workout);
              console.log(`[LunaWorkoutParser] Found workout: ${workout.workoutId}, sportType: ${workout.sportType}, ` +
                `startTime: ${workout.startTime.toISOString()}, endTime: ${workout.endTime.toISOString()}, duration: ${workout.durationSec}s`);
            }
          }
        } catch (parseError) {
          console.warn(`[LunaWorkoutParser] Failed to parse line: ${parseError}`);
        }
      }
      
      const workouts = Array.from(workoutsMap.values());
      console.log(`[LunaWorkoutParser] Total workouts found for ${targetDate.toISOString().split('T')[0]}: ${workouts.length}`);
      
      return workouts;
      
    } catch (error) {
      console.error(`[LunaWorkoutParser] Error reading file: ${error}`);
      throw new Error(`Failed to parse Luna workout log: ${error}`);
    }
  }
  
  /**
   * Parse a single workout line containing DevSportInfoBean
   */
  private static parseWorkoutLine(line: string): IParsedWorkout | null {
    try {
      // Extract recordPointDataId
      const workoutIdMatch = line.match(/recordPointDataId='([^']+)'/);
      if (!workoutIdMatch) return null;
      const workoutId = workoutIdMatch[1];
      
      // Extract numeric/string fields using regex
      const getNumber = (key: string): number => {
        const match = line.match(new RegExp(`${key}=(\\d+\\.?\\d*)`));
        return match ? parseFloat(match[1]) : 0;
      };
      
      const sportType = getNumber('recordPointSportType');
      const startTimeMs = getNumber('reportSportStartTime');
      const durationSec = getNumber('reportDuration');
      
      if (!startTimeMs) {
        console.warn(`[LunaWorkoutParser] Missing start time for workout ${workoutId}`);
        return null;
      }
      
      // Luna timestamps are already in UTC, use them directly
      const startTimeUTC = startTimeMs;
      const endTimeUTC = startTimeMs + (durationSec * 1000);
      
      // Parse summary fields
      const summary = {
        avgHeart: getNumber('reportAvgHeart'),
        maxHeart: getNumber('reportMaxHeart'),
        minHeart: getNumber('reportMinHeart'),
        calories: getNumber('reportCal'),
        steps: getNumber('reportTotalStep'),
        distance: getNumber('reportDistance'),
        avgPace: getNumber('reportAvgPace'),
        fastPace: getNumber('reportFastPace'),
        slowestPace: getNumber('reportSlowestPace'),
        avgSpeed: getNumber('reportAvgSpeed'),
        fastSpeed: getNumber('reportFastSpeed'),
        avgStepSpeed: getNumber('reportAvgStepSpeed'),
        maxStepSpeed: getNumber('reportMaxStepSpeed'),
        trainingEffect: getNumber('reportTrainingEffect'),
        trainingLoad: getNumber('reportTrainingLoad'),
        vo2max: getNumber('reportVO2max'),
        recoveryTime: getNumber('reportRecoveryTime'),
        heartWarmUp: getNumber('reportHeartWarmUp'),
        heartFatBurning: getNumber('reportHeartFatBurning'),
        heartAerobic: getNumber('reportHeartAerobic'),
        heartAnaerobic: getNumber('reportHeartAnaerobic'),
      };
      
      // Parse ringPointData array using startTimeIST as base
      // Note: pointTime in ringPointData is bugged (+30s increments instead of +1s)
      // We use index-based calculation instead: startTime + (index * 1 second)
      const readings = this.parseRingPointData(line, startTimeUTC);
      
      return {
        workoutId,
        sportType,
        startTime: new Date(startTimeUTC),
        endTime: new Date(endTimeUTC),
        durationSec,
        summary,
        readings,
      };
      
    } catch (error) {
      console.error(`[LunaWorkoutParser] Error parsing workout line: ${error}`);
      return null;
    }
  }
  
  /**
   * Parse ringPointData array from the workout line
   * Format: ringPointData=[RingPointData{pointTime=123, heartRate=80, ...}, ...]
   * 
   * NOTE: The pointTime field in each RingPointData is BUGGED - it uses +30 second
   * increments instead of +1 second. We ignore pointTime and use index-based
   * timestamps instead: timestamp = startTimeMs + (index * 1000ms)
   * 
   * @param line The workout log line
   * @param startTimeMs The workout start time in milliseconds (UTC)
   */
  private static parseRingPointData(line: string, startTimeMs: number): IParsedWorkout['readings'] {
    const readings: IParsedWorkout['readings'] = [];
    
    try {
      // Extract the ringPointData array section
      const ringDataMatch = line.match(/ringPointData=\[(.*?)\](?:}|$)/);
      if (!ringDataMatch) {
        return readings;
      }
      
      const ringDataStr = ringDataMatch[1];
      
      // Match each RingPointData{...} entry
      const pointPattern = /RingPointData\{([^}]+)\}/g;
      let match;
      let index = 0;
      
      while ((match = pointPattern.exec(ringDataStr)) !== null) {
        const pointStr = match[1];
        
        // Extract HR values from the point (ignore buggy pointTime)
        const heartRateMatch = pointStr.match(/heartRate=(\d+)/);
        const heartRateConfMatch = pointStr.match(/heartRateConfidence=(\d+)/);
        const intensityMatch = pointStr.match(/exerciseIntensity=(\d+)/);
        
        const heartRate = heartRateMatch ? parseInt(heartRateMatch[1]) : 0;
        
        // Skip invalid HR values (0 = no data, 255 = sensor error/placeholder)
        if (heartRate <= 0 || heartRate === 255) {
          index++;
          continue;
        }
        
        // Calculate timestamp using index: startTime + (index * 1 second)
        // This fixes the bug where pointTime increments by 30s instead of 1s
        const timestampMs = startTimeMs + (index * 1000);
        
        readings.push({
          timestamp: new Date(timestampMs),
          heartRate: heartRate,
          heartRateConfidence: heartRateConfMatch ? parseInt(heartRateConfMatch[1]) : 0,
          exerciseIntensity: intensityMatch ? parseInt(intensityMatch[1]) : 0,
        });
        
        index++;
      }
      
      if (readings.length > 0) {
        console.log(`[LunaWorkoutParser] Parsed ${readings.length} HR readings`);
        console.log(`[LunaWorkoutParser]   First: ${readings[0].timestamp.toISOString()} HR=${readings[0].heartRate}`);
        console.log(`[LunaWorkoutParser]   Last:  ${readings[readings.length - 1].timestamp.toISOString()} HR=${readings[readings.length - 1].heartRate}`);
        const durationSec = (readings[readings.length - 1].timestamp.getTime() - readings[0].timestamp.getTime()) / 1000;
        console.log(`[LunaWorkoutParser]   Span:  ${durationSec} seconds (${(durationSec / 60).toFixed(1)} minutes)`);
      }
      
    } catch (error) {
      console.warn(`[LunaWorkoutParser] Error parsing ringPointData: ${error}`);
    }
    
    return readings;
  }
}
