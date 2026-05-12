import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout data from NFA iOS app log
 * Structure intentionally kept SAME as Android parser
 */
export interface IParsedWorkout {
  workoutId: string;
  sportType: number;
  startTime: Date;
  endTime: Date;
  durationSec: number;

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

  readings: Array<{
    timestamp: Date;
    heartRate: number;
    heartRateConfidence: number;
    exerciseIntensity: number;
  }>;
}

/**
 * iOS parser internal structure
 */
interface IIosWorkoutBlock {
  logDate: string;
  paramsLine: string;
  workoutId?: string;

  additionalFields: Record<string, number>;
}

/**
 * NFA iOS Workout Parser
 */
export class NFAIosWorkoutParser {

  /**
   * Parse workouts from iOS log file
   */
  static async parseWorkoutsFromLog(
    filePath: string,
    targetDate: Date
  ): Promise<IParsedWorkout[]> {

    console.log(`[NFAIosWorkoutParser] Parsing file: ${filePath}`);

    const workouts: IParsedWorkout[] = [];

    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentWorkout: IIosWorkoutBlock | null = null;

    for await (const line of rl) {

      // Detect workout start
      if (line.includes('Workout save param [')) {

        // Finalize previous block if exists
        if (currentWorkout) {
          const parsed = this.buildWorkout(currentWorkout);

          if (parsed) {
            const workoutDateStr = parsed.startTime.toISOString().split('T')[0];
            const targetDateStr = targetDate.toISOString().split('T')[0];

            if (workoutDateStr === targetDateStr) {
              workouts.push(parsed);
            }
          }
        }

        // Extract date from previous timestamp line if possible
        const dateMatch = line.match(/(\d{4}-\d{2}-\d{2})/);

        currentWorkout = {
          logDate: dateMatch?.[1] || '',
          paramsLine: line,
          additionalFields: {},
        };

        continue;
      }

      if (!currentWorkout) {
        continue;
      }

      // Workout ID
      const workoutIdMatch = line.match(/Workout id from server\s+(\d+)/);

      if (workoutIdMatch) {
        currentWorkout.workoutId = workoutIdMatch[1];
        continue;
      }

      // Additional summary fields
      const additionalFieldMatch = line.match(/([A-Za-z0-9_]+)\s*=\s*(-?\d+)/);

      if (additionalFieldMatch) {
        currentWorkout.additionalFields[additionalFieldMatch[1]] =
          parseInt(additionalFieldMatch[2]);
      }
    }

    // Final block
    if (currentWorkout) {
      const parsed = this.buildWorkout(currentWorkout);

      if (parsed) {
        const workoutDateStr = parsed.startTime.toISOString().split('T')[0];
        const targetDateStr = targetDate.toISOString().split('T')[0];

        if (workoutDateStr === targetDateStr) {
          workouts.push(parsed);
        }
      }
    }

    console.log(`[NFAIosWorkoutParser] Total workouts: ${workouts.length}`);

    return workouts;
  }

  /**
   * Convert iOS block -> Android compatible structure
   */
  private static buildWorkout(
    block: IIosWorkoutBlock
  ): IParsedWorkout | null {

    try {

      const jsonStr = this.extractWorkoutJson(block.paramsLine);

      if (!jsonStr) {
        return null;
      }

      const workoutData = this.parsePseudoJson(jsonStr);

      const startDate = workoutData.date;
      const startTime = workoutData.start_time;
      const endTime = workoutData.end_time;

      if (!startDate || !startTime || !endTime) {
        return null;
      }

      const startDateTime = new Date(`${startDate}T${startTime}:00+05:30`);
      const endDateTime = new Date(`${startDate}T${endTime}:00+05:30`);

      const durationSec =
        Number(workoutData.duration_seconds || 0);

      const hrValues: number[] = Array.isArray(workoutData.hr_value)
        ? workoutData.hr_value
        : [];

      const readings = this.buildReadings(
        hrValues,
        startDateTime
      );

      return {
        workoutId:
          block.workoutId ||
          `${startDate}-${startTime}-${workoutData.activity_type}`,

        sportType:
          Number(block.additionalFields.recordPointSportType || 0),

        startTime: startDateTime,

        endTime:
          durationSec > 0
            ? new Date(startDateTime.getTime() + durationSec * 1000)
            : endDateTime,

        durationSec,

        summary: {
          avgHeart:
            Number(block.additionalFields.reportAvgHeart || 0),

          maxHeart:
            Number(block.additionalFields.reportMaxHeart || 0),

          minHeart:
            Number(block.additionalFields.reportMinHeart || 0),

          calories:
            Number(workoutData.calories || 0),

          steps:
            Number(workoutData.steps || 0),

          distance:
            Number(workoutData.distance || 0),

          avgPace:
            Number(block.additionalFields.reportAveragePace || 0),

          fastPace: 0,

          slowestPace: 0,

          avgSpeed: 0,

          fastSpeed: 0,

          avgStepSpeed: 0,

          maxStepSpeed: 0,

          trainingEffect:
            Number(block.additionalFields.reportTrainingEffect || 0),

          trainingLoad:
            Number(block.additionalFields.reportSportTrainingLoad || 0),

          vo2max: 0,

          recoveryTime:
            Number(workoutData.recovery_time || 0),

          heartWarmUp:
            Number(block.additionalFields.reportHeartWarmUp || 0),

          heartFatBurning:
            Number(block.additionalFields.reportHeartFatBurning || 0),

          heartAerobic:
            Number(block.additionalFields.reportHeartAerobic || 0),

          heartAnaerobic:
            Number(block.additionalFields.reportHeartAnaerobic || 0),
        },

        readings,
      };

    } catch (error) {
      console.error(
        `[NFAIosWorkoutParser] Failed to build workout: ${error}`
      );

      return null;
    }
  }

  /**
   * Extract pseudo JSON section from:
   * Workout save param [...]
   */
  private static extractWorkoutJson(line: string): string | null {

    const match = line.match(/Workout save param\s+(\[.*\])/);

    return match ? match[1] : null;
  }

  /**
   * Parse Swift dictionary-like structure
   */
  private static parsePseudoJson(input: string): any {

  const result: any = {};

  // Remove outer brackets
  const content = input.trim().replace(/^\[/, '').replace(/\]$/, '');

  // Match key-value pairs
  // Handles:
  // key: value
  // key: [array]
  const pairRegex = /"([^"]+)"\s*:\s*(\[[^\]]*\]|"[^"]*"|[^,]+)(?:,|$)/g;

  let match;

  while ((match = pairRegex.exec(content)) !== null) {

    const key = match[1];
    let value: any = match[2].trim();

    // Array
    if (value.startsWith('[') && value.endsWith(']')) {

      try {
        value = JSON.parse(value);
      } catch {
        value = [];
      }

    }

    // String
    else if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // Number
    else if (!isNaN(Number(value))) {
      value = Number(value);
    }

    result[key] = value;
  }

  return result;
}

  /**
   * Build per-second HR readings
   */
  private static buildReadings(
    hrValues: number[],
    startTime: Date
  ): IParsedWorkout['readings'] {

    const readings: IParsedWorkout['readings'] = [];

    for (let i = 0; i < hrValues.length; i++) {

      const hr = hrValues[i];

      if (hr <= 0 || hr === 255) {
        continue;
      }

      readings.push({
        timestamp: new Date(startTime.getTime() + (i * 1000)),
        heartRate: hr,
        heartRateConfidence: 4,
        exerciseIntensity: 0,
      });
    }

    return readings;
  }
}