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

  private static getNumber(obj: any, keys: string[]): number {
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return Number(obj[key]) || 0;
      }
    }
    return 0;
  }

  static async parseWorkoutsFromLog(
    filePath: string,
    targetDate: Date
  ): Promise<IParsedWorkout[]> {

    console.log('\n🍎 ===== NFA iOS WORKOUT PARSER START =====');
    console.log(`[NFAIosWorkoutParser] File: ${filePath}`);
    console.log(`[NFAIosWorkoutParser] Target Date: ${targetDate.toISOString()}`);

    const targetDateStr = getUTCDateKey(targetDate);
    const workouts: IParsedWorkout[] = [];

    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let totalLines = 0;
    let candidateLines = 0;

    for await (const line of rl) {
      totalLines++;

      if (!line.includes('Workout SDK logs')) continue;

      candidateLines++;

      const parsed = this.buildWorkout({ paramsLine: line });

      if (!parsed) continue;

      const workoutDateStr = getUTCDateKey(parsed.startTime);

      if (workoutDateStr === targetDateStr) {
        workouts.push(parsed);

        console.log(
          `[NFAIosWorkoutParser] Found workout: ${parsed.workoutId}, sportType: ${parsed.sportType}, ` +
          `startTime: ${parsed.startTime.toISOString()}, endTime: ${parsed.endTime.toISOString()}, duration: ${parsed.durationSec}s`
        );
      }
    }

    console.log(`[NFAIosWorkoutParser] Total lines: ${totalLines}`);
    console.log(`[NFAIosWorkoutParser] Candidate lines: ${candidateLines}`);
    console.log(`[NFAIosWorkoutParser] Final workouts: ${workouts.length}`);
    console.log('🍎 ===== NFA iOS WORKOUT PARSER END =====\n');

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

      const hrValues: number[] = Array.isArray(workoutData.hr_values)
        ? workoutData.hr_values
        : [];

      const readings = this.buildReadings(hrValues, startTime);

      return {
        workoutId: `${startUnix}-${workoutData.recordPointSportType}`,
        sportType: Number(workoutData.recordPointSportType || 0),
        startTime,
        endTime,
        durationSec: endUnix - startUnix,

        summary: {
  avgHeart: this.getNumber(workoutData, [
    'reportAvgHeart',
    'avgHeart',
    'avg_hr',
  ]),

  maxHeart: this.getNumber(workoutData, [
    'reportMaxHeart',
    'maxHeart',
    'max_hr',
  ]),

  minHeart: this.getNumber(workoutData, [
    'reportMinHeart',
    'minHeart',
    'min_hr',
  ]),

  calories: this.getNumber(workoutData, [
    'calorie',
    'reportCal',
    'calories',
  ]),

  steps: this.getNumber(workoutData, [
    'reportTotalStep',
    'steps',
  ]),

  distance: this.getNumber(workoutData, [
    'reportDistance',
    'distance',
  ]),

  avgPace: this.getNumber(workoutData, [
    'reportAveragePace',
    'avgPace',
  ]),

  fastPace: this.getNumber(workoutData, [
    'reportFastPace',
  ]),

  slowestPace: this.getNumber(workoutData, [
    'reportSlowestPace',
  ]),

  avgSpeed: this.getNumber(workoutData, [
    'reportAvgSpeed',
  ]),

  fastSpeed: this.getNumber(workoutData, [
    'reportFastSpeed',
  ]),

  avgStepSpeed: this.getNumber(workoutData, [
    'reportAvgStepSpeed',
  ]),

  maxStepSpeed: this.getNumber(workoutData, [
    'reportMaxStepSpeed',
  ]),

  trainingEffect: this.getNumber(workoutData, [
    'reportTrainingEffect',
  ]),

  trainingLoad: this.getNumber(workoutData, [
    'reportSportTrainingLoad',
    'reportTrainingLoad',
  ]),

  vo2max: this.getNumber(workoutData, [
    'reportVO2max',
  ]),

  recoveryTime: this.getNumber(workoutData, [
    'reportRecoveryTime',
  ]),

  heartWarmUp: this.getNumber(workoutData, [
    'reportHeartWarmUp',
  ]),

  heartFatBurning: this.getNumber(workoutData, [
    'reportHeartFatBurning',
  ]),

  heartAerobic: this.getNumber(workoutData, [
    'reportHeartAerobic',
  ]),

  heartAnaerobic: this.getNumber(workoutData, [
    'reportHeartAnaerobic',
  ]),
},

        readings,
      };

    } catch (error) {
      console.error(`[buildWorkout] Parse failed:`, error);
      return null;
    }
  }

  private static extractWorkoutJson(line: string): string | null {
    const match = line.match(/Workout SDK logs\s+(\[[\s\S]*\])/);
    return match ? match[1] : null;
  }

  private static parsePseudoJson(input: string): any {
    const result: any = {};

    const content = input.trim()
      .replace(/^\[/, '')
      .replace(/\]$/, '');

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
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (!isNaN(Number(value))) {
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

    if (readings.length > 0) {
      console.log(`[NFAIosWorkoutParser] Parsed ${readings.length} HR readings`);
      console.log(`[NFAIosWorkoutParser]   First: ${readings[0].timestamp.toISOString()} HR=${readings[0].heartRate}`);
      console.log(`[NFAIosWorkoutParser]   Last:  ${readings[readings.length - 1].timestamp.toISOString()} HR=${readings[readings.length - 1].heartRate}`);
      const durationSec =
        (readings[readings.length - 1].timestamp.getTime() - readings[0].timestamp.getTime()) / 1000;
      console.log(`[NFAIosWorkoutParser]   Span:  ${durationSec} seconds (${(durationSec / 60).toFixed(1)} minutes)`);
    }

    return readings;
  }
}