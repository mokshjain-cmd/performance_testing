import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout from Polar CSV export
 */
export interface IPolarWorkout {
  name: string;
  sport: string;
  sportType: number;
  date: string;
  startTimeStr: string;
  startTime: Date;
  endTime: Date;
  durationSec: number;

  avgHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  totalDistanceKm?: number;
  avgSpeedKmh?: number;
  maxSpeedKmh?: number;
  avgPace?: string;
  maxPace?: string;
  avgCadence?: number;
  avgStrideLengthCm?: number;
  trainingLoad?: number;
  ascentM?: number;
  descentM?: number;
  avgPower?: number;
  maxPower?: number;

  heightCm?: number;
  weightKg?: number;
  hrMax?: number;
  hrSit?: number;
  vo2max?: number;

  hrReadings: Array<{
    timestamp: Date;
    heartRate: number;
    speed?: number;
    cadence?: number;
    altitude?: number;
    temperature?: number;
    power?: number;
  }>;
}

const POLAR_TO_LUNA_SPORT_TYPE: Record<string, number> = {
  RUNNING: 1,
  OUTDOOR_RUNNING: 1,
  INDOOR_RUNNING: 3,
  TREADMILL: 66,
  TREADMILL_RUNNING: 66,
  TRAIL_RUNNING: 5,
  MARATHON: 139,

  WALKING: 2,
  OUTDOOR_WALKING: 2,
  INDOOR_WALKING: 135,

  HIKING: 13,
  TREKKING: 4,

  CYCLING: 6,
  OUTDOOR_CYCLING: 6,
  ROAD_CYCLING: 6,
  INDOOR_CYCLING: 7,
  SPINNING: 7,
  MOUNTAIN_BIKING: 124,

  SWIMMING: 21,
  POOL_SWIMMING: 21,
  OPEN_WATER_SWIMMING: 22,
  OPEN_WATER: 22,

  YOGA: 35,
  PILATES: 28,
  ELLIPTICAL: 34,
  CROSS_TRAINER: 34,
  STRENGTH_TRAINING: 25,
  WEIGHT_TRAINING: 25,
  FUNCTIONAL_TRAINING: 94,
  CORE_TRAINING: 23,
  CORE: 23,
  HIIT: 64,
  HIGH_INTENSITY_INTERVAL_TRAINING: 64,
  CIRCUIT_TRAINING: 64,
  CROSSFIT: 84,
  CROSS_TRAINING: 84,
  ROWING: 121,
  ROWING_MACHINE: 121,
  JUMP_ROPE: 122,
  ROPE_SKIPPING: 122,

  BADMINTON: 12,
  TENNIS: 105,
  TABLE_TENNIS: 11,
  PING_PONG: 11,
  BASKETBALL: 9,
  SOCCER: 10,
  FOOTBALL: 10,
  CRICKET: 39,
  GOLF: 134,
  VOLLEYBALL: 45,
  SQUASH: 42,

  DANCE: 52,
  DANCING: 52,
  AEROBICS: 85,
  ZUMBA: 53,

  BOXING: 56,
  KICKBOXING: 125,
  MARTIAL_ARTS: 62,

  MEDITATION: 150,
  STRETCHING: 26,
  TRIATHLON: 123,

  OTHER: 0,
  OTHER_OUTDOOR: 0,
  OTHER_INDOOR: 0,
};

export class PolarWorkoutParser {
  private static readonly IST_OFFSET_MS = 19800000;     // UTC+5:30
  private static readonly CST_OFFSET_MS = 28800000;     // UTC+8

  static async parseWorkout(filePath: string): Promise<IPolarWorkout | null> {
    console.log(`[PolarWorkoutParser] Parsing file: ${filePath}`);

    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });

      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lineNumber = 0;
      let summaryHeaderCols: string[] = [];
      let dataHeaderCols: string[] = [];
      let summaryParsed = false;
      let dataHeaderParsed = false;
      let workoutStartTime: Date | null = null;
      let isSimpleFormat = false;

      let workout: Partial<IPolarWorkout> = {
        hrReadings: [],
      };

      rl.on('line', (line: string) => {
        lineNumber++;

        if (!line.trim()) return;

        const cols = this.parseCSVLine(line);

        /**
         * line 1
         */
        if (lineNumber === 1) {
          summaryHeaderCols = cols;

          if (
            cols.length >= 2 &&
            cols[0].trim().toLowerCase() === 'time' &&
            cols[1].trim().toLowerCase() === 'polar'
          ) {
            isSimpleFormat = true;
            summaryParsed = true;
            dataHeaderParsed = true;

            workout = {
              name: 'Polar HR Import',
              sport: 'OTHER',
              sportType: 0,
              date: '',
              startTimeStr: '',
              durationSec: 0,
              hrReadings: [],
            };
          }

          return;
        }

        /**
         * SIMPLE FORMAT
         */
        if (isSimpleFormat) {
          const reading = this.parseSimplePolarRow(cols);

          if (reading) {
            workout.hrReadings!.push(reading);

            if (!workout.startTime) {
              workout.startTime = reading.timestamp;
              workoutStartTime = reading.timestamp;
              workout.date = reading.timestamp.toISOString().slice(0, 10);
              workout.startTimeStr = reading.timestamp.toISOString().slice(11, 19);
            }
          }

          return;
        }

        /**
         * FULL FORMAT
         */
        if (lineNumber === 2 && !summaryParsed) {
          workout = this.parseSummaryRow(summaryHeaderCols, cols);
          workout.hrReadings = [];
          workoutStartTime = workout.startTime || null;
          summaryParsed = true;
          return;
        }

        if (summaryParsed && !dataHeaderParsed) {
          dataHeaderCols = cols;
          dataHeaderParsed = true;
          return;
        }

        if (dataHeaderParsed && workoutStartTime) {
          const reading = this.parseDataRow(
            dataHeaderCols,
            cols,
            workoutStartTime
          );

          if (reading && reading.heartRate > 0) {
            workout.hrReadings!.push(reading);
          }
        }
      });

      rl.on('close', () => {
        if (!workout.startTime || !workout.hrReadings?.length) {
          resolve(null);
          return;
        }

        if (!workout.endTime) {
          workout.endTime =
            workout.hrReadings[workout.hrReadings.length - 1].timestamp;

          workout.durationSec = Math.floor(
            (workout.endTime.getTime() - workout.startTime.getTime()) / 1000
          );
        }

        if (!workout.maxHeartRate) {
          const vals = workout.hrReadings
            .map(r => r.heartRate)
            .filter(v => v > 0);

          if (vals.length) {
            workout.maxHeartRate = Math.max(...vals);
          }
        }

        if (!workout.avgHeartRate && workout.hrReadings.length) {
          const vals = workout.hrReadings
            .map(r => r.heartRate)
            .filter(v => v > 0);

          if (vals.length) {
            workout.avgHeartRate = Math.round(
              vals.reduce((a, b) => a + b, 0) / vals.length
            );
          }
        }

        resolve(workout as IPolarWorkout);
      });

      rl.on('error', err => reject(err));
    });
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private static parseSimplePolarRow(values: string[]) {
    if (values.length < 2) return null;

    const timeStr = values[0];
    const hr = parseInt(values[1]);

    if (!timeStr || isNaN(hr)) return null;

    const parts = timeStr.split(':').map(Number);

    if (parts.length !== 3) return null;

    const now = new Date();

    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    const cstMs = Date.UTC(
      year,
      month,
      day,
      parts[0],
      parts[1],
      parts[2]
    );

    const utcMs = cstMs - this.CST_OFFSET_MS;

    return {
      timestamp: new Date(utcMs),
      heartRate: hr,
    };
  }

  private static parseSummaryRow(
    headers: string[],
    values: string[]
  ): Partial<IPolarWorkout> {
    const getVal = (partial: string): string | undefined => {
      const idx = headers.findIndex(h =>
        h.toLowerCase().includes(partial.toLowerCase())
      );

      return idx >= 0 ? values[idx] : undefined;
    };

    const parseNum = (v?: string): number | undefined => {
      if (!v) return undefined;
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };

    const dateStr = getVal('Date') || '';
    const timeStr = getVal('Start time') || '';
    const durationStr = getVal('Duration') || '';

    let startTime: Date | undefined;
    let endTime: Date | undefined;
    let durationSec = 0;

    if (dateStr && timeStr) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hour, minute, second] = timeStr.split(':').map(Number);

      const istAsUtcMs = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second || 0
      );

      const utcMs = istAsUtcMs - this.IST_OFFSET_MS;
      startTime = new Date(utcMs);
    }

    if (durationStr) {
      const parts = durationStr.split(':').map(Number);

      if (parts.length === 3) {
        durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        durationSec = parts[0] * 60 + parts[1];
      }
    }

    if (startTime && durationSec) {
      endTime = new Date(startTime.getTime() + durationSec * 1000);
    }

    const sport = getVal('Sport') || 'OTHER';
    const sportKey = sport.toUpperCase().replace(/\s+/g, '_');
    const sportType = POLAR_TO_LUNA_SPORT_TYPE[sportKey] ?? 0;

    return {
      name: getVal('Name') || '',
      sport,
      sportType,
      date: dateStr,
      startTimeStr: timeStr,
      startTime,
      endTime,
      durationSec,

      avgHeartRate: parseNum(getVal('Average heart rate')),
      calories: parseNum(getVal('Calories')),
      totalDistanceKm: parseNum(getVal('Total distance')),
      avgSpeedKmh: parseNum(getVal('Average speed')),
      maxSpeedKmh: parseNum(getVal('Max speed')),
      avgPace: getVal('Average pace'),
      maxPace: getVal('Max pace'),
      avgCadence: parseNum(getVal('Average cadence')),
      avgStrideLengthCm: parseNum(getVal('Average stride length')),
      trainingLoad: parseNum(getVal('Training load')),
      ascentM: parseNum(getVal('Ascent')),
      descentM: parseNum(getVal('Descent')),
      avgPower: parseNum(getVal('Average power')),
      maxPower: parseNum(getVal('Max power')),
      heightCm: parseNum(getVal('Height')),
      weightKg: parseNum(getVal('Weight')),
      hrMax: parseNum(getVal('HR max')),
      hrSit: parseNum(getVal('HR sit')),
      vo2max: parseNum(getVal('VO2max')),
    };
  }

  private static parseDataRow(
    headers: string[],
    values: string[],
    startTime: Date
  ) {
    const getIdx = (partial: string) =>
      headers.findIndex(h =>
        h.toLowerCase().includes(partial.toLowerCase())
      );

    const timeIdx = getIdx('Time');
    const hrIdx = getIdx('HR');

    if (timeIdx < 0 || hrIdx < 0) return null;

    const timeStr = values[timeIdx];
    const hr = parseInt(values[hrIdx]);

    if (!timeStr || isNaN(hr) || hr <= 0) return null;

    const [h, m, s] = timeStr.split(':').map(Number);

    const offsetMs = (h * 3600 + m * 60 + s) * 1000;

    const timestamp = new Date(startTime.getTime() + offsetMs);

    const parseNum = (idx: number) => {
      if (idx < 0 || !values[idx]) return undefined;
      const n = parseFloat(values[idx]);
      return isNaN(n) ? undefined : n;
    };

    return {
      timestamp,
      heartRate: hr,
      speed: parseNum(getIdx('Speed')),
      cadence: parseNum(getIdx('Cadence')),
      altitude: parseNum(getIdx('Altitude')),
      temperature: parseNum(getIdx('Temperature')),
      power: parseNum(getIdx('Power')),
    };
  }

  static findWorkoutOverlap(
    polarWorkout: IPolarWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { overlapPercent: number; isMatch: boolean } | null {
    const polarStart = polarWorkout.startTime.getTime();
    const polarEnd = polarWorkout.endTime.getTime();
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();

    const overlapStart = Math.max(polarStart, lunaStart);
    const overlapEnd = Math.min(polarEnd, lunaEnd);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);

    const lunaDuration = lunaEnd - lunaStart;
    if (lunaDuration <= 0) return null;

    const overlapPercent = (overlapMs / lunaDuration) * 100;

    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPercent,
    };
  }

  static extractHRInTimeWindow(
    polarWorkout: IPolarWorkout,
    startTime: Date,
    endTime: Date
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();

    return polarWorkout.hrReadings
      .filter(r => {
        const ts = r.timestamp.getTime();
        return ts >= startMs && ts <= endMs;
      })
      .map(r => ({
        timestamp: r.timestamp,
        heartRate: r.heartRate,
      }));
  }
}