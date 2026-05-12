import * as fs from 'fs';
import * as readline from 'readline';

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

interface IIosWorkoutBlock {
  paramsLine: string;
}

function getUTCDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class NFAIosWorkoutParser {

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

    for await (const line of rl) {

      if (!line.includes('Workout SDK logs [')) continue;

      const parsed = this.buildWorkout({ paramsLine: line });

      if (!parsed) continue;

      const workoutDateStr = getUTCDateKey(parsed.startTime);
      const targetDateStr = getUTCDateKey(targetDate);

      if (workoutDateStr === targetDateStr) {
        workouts.push(parsed);
      }
    }

    console.log(`[NFAIosWorkoutParser] Total workouts: ${workouts.length}`);

    return workouts;
  }

  private static buildWorkout(
    block: IIosWorkoutBlock
  ): IParsedWorkout | null {

    try {

      const jsonStr = this.extractWorkoutJson(block.paramsLine);
      if (!jsonStr) return null;

      const workoutData = this.parsePseudoJson(jsonStr);

      const startUnix = Number(workoutData.sportTime);
      const endUnix = Number(workoutData.sportEndTime);

      if (!startUnix || !endUnix) return null;

      const startTime = new Date(startUnix * 1000);
      const endTime = new Date(endUnix * 1000);

      const durationSec = endUnix - startUnix;

      const hrValues: number[] = Array.isArray(workoutData.hr_values)
        ? workoutData.hr_values
        : [];

      const readings = this.buildReadings(hrValues, startTime);

      return {
        workoutId: `${startUnix}-${workoutData.recordPointSportType}`,

        sportType: Number(workoutData.recordPointSportType || 0),

        startTime,
        endTime,
        durationSec,

        summary: {
          avgHeart: Number(workoutData.reportAvgHeart || 0),
          maxHeart: Number(workoutData.reportMaxHeart || 0),
          minHeart: Number(workoutData.reportMinHeart || 0),

          calories: Number(workoutData.calorie || 0),

          steps: Number(workoutData.reportTotalStep || 0),

          distance: Number(workoutData.reportDistance || 0),

          avgPace: Number(workoutData.reportAveragePace || 0),

          fastPace: 0,
          slowestPace: 0,

          avgSpeed: 0,
          fastSpeed: 0,

          avgStepSpeed: 0,
          maxStepSpeed: 0,

          trainingEffect: Number(workoutData.reportTrainingEffect || 0),

          trainingLoad: Number(workoutData.reportSportTrainingLoad || 0),

          vo2max: 0,

          recoveryTime: Number(workoutData.reportRecoveryTime || 0),

          heartWarmUp: Number(workoutData.reportHeartWarmUp || 0),

          heartFatBurning: Number(workoutData.reportHeartFatBurning || 0),

          heartAerobic: Number(workoutData.reportHeartAerobic || 0),

          heartAnaerobic: Number(workoutData.reportHeartAnaerobic || 0),
        },

        readings,
      };

    } catch (error) {
      console.error(`[NFAIosWorkoutParser] Failed to build workout: ${error}`);
      return null;
    }
  }

  private static extractWorkoutJson(line: string): string | null {
    const match = line.match(/Workout SDK logs\s+(\[.*\])/);
    return match ? match[1] : null;
  }

  private static parsePseudoJson(input: string): any {

    const result: any = {};
    const content = input.trim().replace(/^\[/, '').replace(/\]$/, '');

    const pairRegex = /"([^"]+)"\s*:\s*(\[[^\]]*\]|"[^"]*"|[^,]+)(?:,|$)/g;

    let match;

    while ((match = pairRegex.exec(content)) !== null) {

      const key = match[1];
      let value: any = match[2].trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          value = JSON.parse(value);
        } catch {
          value = [];
        }
      }

      else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      else if (!isNaN(Number(value))) {
        value = Number(value);
      }

      result[key] = value;
    }

    return result;
  }

  private static buildReadings(
    hrValues: number[],
    startTime: Date
  ): IParsedWorkout['readings'] {

    const readings: IParsedWorkout['readings'] = [];

    for (let i = 0; i < hrValues.length; i++) {

      const hr = hrValues[i];

      if (hr <= 0 || hr === 255) continue;

      readings.push({
        timestamp: new Date(startTime.getTime() + i * 1000),
        heartRate: hr,
        heartRateConfidence: 4,
        exerciseIntensity: 0,
      });
    }

    return readings;
  }
}