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
  
  // Summary from DevSportInfoBean / unparsed sports data JSON
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
 * Extracts workout entries from three log formats:
 *   1. App Log   — "RECORD_WORKOUT received workout DevSportInfoBean{...}"
 *   2. BLE Log   — "----> sportparsing ... devSportInfoBean --->DevSportInfoBean{...}"
 *   3. NFA Log   — "NFA_LOGS -> unparsed sports data {...}" (JSON, pointTime in UTC seconds)
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
    
    // Two separate maps so NFA and DevSportInfoBean results never overwrite each other.
    // Within each map, later entries for the same workoutId override earlier ones
    // (handles the case where the same workout appears twice in a single format,
    // e.g. once in the App Log and once in the BLE Log).
    const nfaWorkoutsMap = new Map<string, IParsedWorkout>();
    const devSportWorkoutsMap = new Map<string, IParsedWorkout>();
    
    try {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      const targetDateStr = targetDate.toISOString().split('T')[0];

      for await (const line of rl) {
        // Detect which log format this line belongs to:
        //   App Log: "RECORD_WORKOUT received workout DevSportInfoBean{...}"
        //   BLE Log: "----> sportparsing ... devSportInfoBean --->DevSportInfoBean{...}"
        //   NFA Log: "NFA_LOGS -> unparsed sports data {...}"
        // Note: case-insensitive check for 'sportparsing' handles 'SportParsing' variants
        const lineLower = line.toLowerCase();
        const isAppLogLine     = line.includes('RECORD_WORKOUT received workout DevSportInfoBean{');
        const isBleLogLine     = lineLower.includes('sportparsing') && line.includes('devSportInfoBean --->DevSportInfoBean{');
        const isNfaUnparsedLine = line.includes('NFA_LOGS -> unparsed sports data {');
        
        if (!isAppLogLine && !isBleLogLine && !isNfaUnparsedLine) {
          continue;
        }
        
        try {
          if (isNfaUnparsedLine) {
            // ── NFA format ──────────────────────────────────────────────────
            const workout = this.parseNfaUnparsedSportsDataLine(line);
            if (workout && workout.startTime.toISOString().split('T')[0] === targetDateStr) {
              nfaWorkoutsMap.set(workout.workoutId, workout);
              console.log(`[LunaWorkoutParser] [NFA] Found workout: ${workout.workoutId}, ` +
                `sportType: ${workout.sportType}, start: ${workout.startTime.toISOString()}, ` +
                `end: ${workout.endTime.toISOString()}, duration: ${workout.durationSec}s`);
            }
          } else {
            // ── DevSportInfoBean format (App Log / BLE Log) ─────────────────
            const workout = this.parseWorkoutLine(line);
            if (workout && workout.startTime.toISOString().split('T')[0] === targetDateStr) {
              devSportWorkoutsMap.set(workout.workoutId, workout);
              console.log(`[LunaWorkoutParser] [DevSport] Found workout: ${workout.workoutId}, ` +
                `sportType: ${workout.sportType}, start: ${workout.startTime.toISOString()}, ` +
                `end: ${workout.endTime.toISOString()}, duration: ${workout.durationSec}s`);
            }
          }
        } catch (parseError) {
          console.warn(`[LunaWorkoutParser] Failed to parse line: ${parseError}`);
        }
      }
      
      // Combine both sources — NFA entries first, then DevSportInfoBean
      const workouts = [
        ...nfaWorkoutsMap.values(),
        ...devSportWorkoutsMap.values(),
      ];
      console.log(
        `[LunaWorkoutParser] Total workouts for ${targetDateStr}: ${workouts.length} ` +
        `(NFA: ${nfaWorkoutsMap.size}, DevSport: ${devSportWorkoutsMap.size})`
      );
      
      return workouts;
      
    } catch (error) {
      console.error(`[LunaWorkoutParser] Error reading file: ${error}`);
      throw new Error(`Failed to parse Luna workout log: ${error}`);
    }
  }

  // ---------------------------------------------------------------------------
  // NFA "unparsed sports data" JSON format
  // ---------------------------------------------------------------------------
  // Log prefix: "NFA_LOGS -> unparsed sports data {json}"
  //
  // Key differences vs DevSportInfoBean:
  //   • Payload is clean JSON — parsed with JSON.parse(), no regex field digging
  //   • ringPointData is a JSON array of objects (not embedded text tokens)
  //   • pointTime in ringPointData is in UTC SECONDS (×1000 = ms) and is
  //     reliable — increments by exactly +1s; no index-based workaround needed
  //   • reportSportEndTime is an explicit field in ms (no need to derive it)
  // ---------------------------------------------------------------------------

  /**
   * Parse a single "NFA_LOGS -> unparsed sports data {...}" line.
   * The JSON payload uses the same field naming convention as DevSportInfoBean
   * (reportAvgHeart, reportMaxHeart, …) so fields map 1-to-1 to IParsedWorkout.
   */
  private static parseNfaUnparsedSportsDataLine(line: string): IParsedWorkout | null {
    try {
      // Extract the JSON object that follows "unparsed sports data "
      const jsonMatch = line.match(/NFA_LOGS -> unparsed sports data ({.*})\s*$/);
      if (!jsonMatch) {
        console.warn('[LunaWorkoutParser] NFA: Could not extract JSON from unparsed sports data line');
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = JSON.parse(jsonMatch[1]);

      const workoutId: string = data.recordPointDataId;
      if (!workoutId) {
        console.warn('[LunaWorkoutParser] NFA: Missing recordPointDataId');
        return null;
      }

      const sportType: number = data.recordPointSportType ?? 0;
      const startTimeMs: number = data.reportSportStartTime;   // UTC ms
      const endTimeMs: number   = data.reportSportEndTime;     // UTC ms (explicit)
      const durationSec: number = data.reportDuration ?? 0;

      if (!startTimeMs) {
        console.warn(`[LunaWorkoutParser] NFA: Missing reportSportStartTime for workout ${workoutId}`);
        return null;
      }

      const summary: IParsedWorkout['summary'] = {
        avgHeart:       data.reportAvgHeart        ?? 0,
        maxHeart:       data.reportMaxHeart        ?? 0,
        minHeart:       data.reportMinHeart        ?? 0,
        calories:       data.reportCal             ?? 0,
        steps:          data.reportTotalStep       ?? 0,
        distance:       data.reportDistance        ?? 0,
        avgPace:        data.reportAvgPace         ?? 0,
        fastPace:       data.reportFastPace        ?? 0,
        slowestPace:    data.reportSlowestPace     ?? 0,
        avgSpeed:       data.reportAvgSpeed        ?? 0,
        fastSpeed:      data.reportFastSpeed       ?? 0,
        avgStepSpeed:   data.reportAvgStepSpeed    ?? 0,
        maxStepSpeed:   data.reportMaxStepSpeed    ?? 0,
        trainingEffect: data.reportTrainingEffect  ?? 0,
        trainingLoad:   data.reportTrainingLoad    ?? 0,
        vo2max:         data.reportVO2max          ?? 0,
        recoveryTime:   data.reportRecoveryTime    ?? 0,
        heartWarmUp:    data.reportHeartWarmUp     ?? 0,
        heartFatBurning:data.reportHeartFatBurning ?? 0,
        heartAerobic:   data.reportHeartAerobic    ?? 0,
        heartAnaerobic: data.reportHeartAnaerobic  ?? 0,
      };

      // Parse ringPointData
      // pointTime here is in UTC SECONDS — multiply by 1000 to get ms.
      // Unlike the DevSportInfoBean/BLE format, this pointTime is NOT bugged:
      // it increments by exactly +1 second per entry and can be trusted directly.
      const readings = this.parseNfaRingPointData(data.ringPointData ?? []);

      if (readings.length > 0) {
        const spanSec = (readings[readings.length - 1].timestamp.getTime() - readings[0].timestamp.getTime()) / 1000;
        console.log(`[LunaWorkoutParser] NFA: Parsed ${readings.length} HR readings`);
        console.log(`[LunaWorkoutParser]   First: ${readings[0].timestamp.toISOString()} HR=${readings[0].heartRate}`);
        console.log(`[LunaWorkoutParser]   Last:  ${readings[readings.length - 1].timestamp.toISOString()} HR=${readings[readings.length - 1].heartRate}`);
        console.log(`[LunaWorkoutParser]   Span:  ${spanSec}s (${(spanSec / 60).toFixed(1)} min)`);
      }

      return {
        workoutId,
        sportType,
        startTime: new Date(startTimeMs),
        endTime:   new Date(endTimeMs ?? startTimeMs + durationSec * 1000),
        durationSec,
        summary,
        readings,
      };

    } catch (error) {
      console.error(`[LunaWorkoutParser] Error parsing NFA unparsed sports data line: ${error}`);
      return null;
    }
  }

  /**
   * Parse the ringPointData JSON array from an NFA unparsed sports data payload.
   *
   * Each element looks like:
   *   { "exerciseIntensity": 2, "heartRate": 113, "heartRateConfidence": 1, "pointTime": 1782216756 }
   *
   * pointTime is in UTC seconds — converted to ms here.
   * The same HR validity rules apply: skip 0 (no data) and 255 (sensor error).
   *
   * @param points The deserialized ringPointData array from JSON
   */
  private static parseNfaRingPointData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    points: Array<Record<string, any>>
  ): IParsedWorkout['readings'] {
    const readings: IParsedWorkout['readings'] = [];

    for (const point of points) {
      const heartRate: number = point.heartRate ?? 0;

      // Skip invalid HR values: 0 = no data, 255 = sensor error/placeholder
      if (heartRate <= 0 || heartRate === 255) {
        continue;
      }

      // pointTime is in UTC seconds — multiply by 1000 for ms
      const timestampMs = (point.pointTime as number) * 1000;

      readings.push({
        timestamp:          new Date(timestampMs),
        heartRate,
        heartRateConfidence: point.heartRateConfidence ?? 0,
        exerciseIntensity:   point.exerciseIntensity   ?? 0,
      });
    }

    return readings;
  }

  // ---------------------------------------------------------------------------
  // Existing DevSportInfoBean format (App Log + BLE Log)
  // ---------------------------------------------------------------------------

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
   * Parse ringPointData array from the workout line (DevSportInfoBean format).
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