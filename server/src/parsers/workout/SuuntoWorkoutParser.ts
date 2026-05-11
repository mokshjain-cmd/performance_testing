import * as fs from 'fs';
import FitParser from 'fit-file-parser';

// ─── Re-export the shared interface ──────────────────────────────────────────
//
// The output type is structurally identical to IGarminWorkout so that
// IngestWorkoutService can consume it through the same processGarminBenchmarkHR
// / findWorkoutOverlap / extractHRInTimeWindow pathway without any changes.
// Just import ISuuntoWorkout wherever you previously used IGarminWorkout.

export interface ISuuntoWorkout {
  // ── Identity ──────────────────────────────────────────────────────────────
  name: string;
  sport: string;               // Raw FIT sport string (e.g. "walking")
  sportType: number;           // Mapped Luna sport type
  date: string;                // YYYY-MM-DD (UTC)
  startTimeStr: string;        // HH:MM:SS (UTC)
  startTime: Date;
  endTime: Date;
  durationSec: number;

  // ── Summary stats ─────────────────────────────────────────────────────────
  avgHeartRate?: number;       // bpm
  minHeartRate?: number;       // bpm
  maxHeartRate?: number;       // bpm
  calories?: number;           // kcal
  totalDistanceKm?: number;    // km
  avgSpeedKmh?: number;        // km/h
  maxSpeedKmh?: number;        // km/h
  avgPace?: string;            // "MM:SS" min/km
  avgCadence?: number;         // steps/min (one foot — matches Garmin convention)
  avgWatts?: number;           // not present in Suunto walking; always undefined
  maxWatts?: number;

  // ── Per-lap metadata ──────────────────────────────────────────────────────
  laps: Array<{
    startTime: Date;
    durationSec: number;
    distanceMeters: number;
    calories: number;
    avgHeartRate?: number;
    maxHeartRate?: number;
    maxSpeedMs?: number;
  }>;

  // ── Per-second readings (consumed by IngestWorkoutService) ────────────────
  hrReadings: Array<{
    timestamp: Date;
    heartRate: number;
    speed?: number;       // m/s
    cadence?: number;     // steps/min (one foot)
    altitude?: number;    // metres
    watts?: number;
    lat?: number;
    lon?: number;
  }>;
}

// ─── Suunto FIT sport → Luna sport type mapping ───────────────────────────────
//
// Suunto uses the ANT+ / FIT protocol sport values which map to the same
// string keys the Garmin parser uses (both follow the FIT spec).
// We therefore reuse the same Luna sport type table.

const SUUNTO_SPORT_TO_LUNA: Record<string, number> = {
  running:           1,
  outdoor_running:   1,
  trail_running:     1,
  track_running:     1,
  virtual_run:       1,
  treadmill_running: 66,
  treadmill:         66,
  indoor_running:    66,
  marathon:          139,
  walking:           2,
  outdoor_walking:   2,
  casual_walking:    2,
  speed_walking:     2,
  indoor_walking:    135,
  hiking:            13,
  mountaineering:    13,
  cycling:           6,
  biking:            6,
  road_cycling:      6,
  gravel_cycling:    6,
  mountain_biking:   124,
  indoor_cycling:    7,
  virtual_ride:      7,
  spinning:          7,
  swimming:          21,
  pool_swimming:     21,
  open_water_swimming: 22,
  strength_training: 25,
  weight_training:   25,
  functional_training: 94,
  core_training:     23,
  hiit:              64,
  cardio_training:   64,
  crossfit:          84,
  elliptical:        34,
  rowing:            121,
  jump_rope:         122,
  pilates:           28,
  yoga:              35,
  aerobics:          85,
  dance:             52,
  boxing:            56,
  kickboxing:        125,
  martial_arts:      62,
  stretching:        26,
  meditation:        150,
  basketball:        9,
  soccer:            10,
  football:          10,
  tennis:            105,
  table_tennis:      11,
  badminton:         12,
  golf:              134,
  triathlon:         123,
  multisport:        123,
  other:             0,
  generic:           0,
};

function mapSportType(suuntoSport: string): number {
  const key = suuntoSport.toLowerCase().replace(/[\s\-]+/g, '_').trim();
  return SUUNTO_SPORT_TO_LUNA[key] ?? 0;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNum(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function secondsToMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * SuuntoWorkoutParser
 *
 * Parses Suunto .fit files exported from Suunto App or Suunto watches
 * (tested with Suunto Race). Produces ISuuntoWorkout — structurally
 * identical to IGarminWorkout — so IngestWorkoutService can consume it
 * through processGarminBenchmarkHR / findWorkoutOverlap / extractHRInTimeWindow
 * without modification.
 *
 * Install dependency: npm install fit-file-parser
 *
 * Usage in IngestWorkoutService:
 *   import { SuuntoWorkoutParser, ISuuntoWorkout } from './SuuntoWorkoutParser';
 *
 *   if (benchmarkFile && benchmarkDeviceType === 'suunto') {
 *     suuntoWorkout = await SuuntoWorkoutParser.parseWorkout(benchmarkFilePath);
 *   }
 *
 *   if (suuntoWorkout && benchmarkDeviceType === 'suunto') {
 *     const overlap = SuuntoWorkoutParser.findWorkoutOverlap(
 *       suuntoWorkout, workout.startTime, workout.endTime, 50
 *     );
 *     if (overlap?.isMatch) {
 *       await this.processSuuntoBenchmarkHR(sessionId, userId, workout, suuntoWorkout);
 *     }
 *   }
 */
export class SuuntoWorkoutParser {

  // ── Public API (mirrors GarminWorkoutParser exactly) ──────────────────────

  /**
   * Parse a Suunto .fit file into ISuuntoWorkout.
   * Returns null if the file cannot be parsed or contains no HR data.
   */
  static async parseWorkout(filePath: string): Promise<ISuuntoWorkout | null> {
    console.log(`[SuuntoWorkoutParser] Parsing file: ${filePath}`);

    const data = fs.readFileSync(filePath);

    const fitData = await new Promise<any>((resolve, reject) => {
        const parser = new FitParser({
            force: true,
            speedUnit: 'm/s',
            lengthUnit: 'm',
            temperatureUnit: 'celsius',
            elapsedRecordField: true,
            mode: 'both',
        });

        parser.parse(
            data,
            ((error: string | undefined, parsed: any) => {
            if (error) {
                reject(new Error(error));
                return;
            }

            resolve(parsed);
            }) as any,
        );
        });

    // ── 1. Pull session summary ────────────────────────────────────────────
    const sessions = (fitData.sessions as Record<string, unknown>[]) ?? [];
    if (sessions.length === 0) {
      console.warn('[SuuntoWorkoutParser] ⚠️ No sessions found in FIT file');
      return null;
    }

    const session = sessions[0];
    const sport        = (session.sport as string) ?? 'other';
    const sessionStart = new Date(session.start_time as string);

    const totalTimerSec  = (toNum(session.total_timer_time)   ?? 0);
    const totalElapsedSec = (toNum(session.total_elapsed_time) ?? totalTimerSec);
    const totalDistanceM = (toNum(session.total_distance)     ?? 0);
    const totalCalories  = (toNum(session.total_calories)     ?? 0);
    const sessionAvgHR   = toNum(session.avg_heart_rate);
    const sessionMinHR   = toNum(session.min_heart_rate);
    const sessionMaxHR   = toNum(session.max_heart_rate);
    const sessionAvgSpeedMs = toNum(session.avg_speed);   // already in m/s
    const sessionMaxSpeedMs = toNum(session.max_speed);
    const sessionAvgCadence = toNum(session.avg_cadence);

    // ── 2. Parse lap summaries ─────────────────────────────────────────────
    const lapsRaw = (fitData.laps as Record<string, unknown>[]) ?? [];

    const lapMetas: ISuuntoWorkout['laps'] = lapsRaw.map(lap => ({
      startTime:      new Date(lap.start_time as string),
      durationSec:    Math.round(toNum(lap.total_timer_time) ?? 0),
      distanceMeters: toNum(lap.total_distance) ?? 0,
      calories:       toNum(lap.total_calories) ?? 0,
      avgHeartRate:   toNum(lap.avg_heart_rate) ?? undefined,
      maxHeartRate:   toNum(lap.max_heart_rate) ?? undefined,
      maxSpeedMs:     toNum(lap.max_speed)      ?? undefined,
    }));

    // ── 3. Flatten all records from top-level records array ────────────────
    //
    // fit-file-parser with mode:'both' provides a top-level `records` array
    // that already contains every trackpoint across all laps, sorted by time.
    // This is more reliable than iterating lap.records individually.

    const allRecords = (fitData.records as Record<string, unknown>[]) ?? [];

    if (allRecords.length === 0) {
      console.warn('[SuuntoWorkoutParser] ⚠️ No records found in FIT file');
      return null;
    }

    const hrReadings: ISuuntoWorkout['hrReadings'] = [];
    const speedSamples:   number[] = [];
    const cadenceSamples: number[] = [];
    const hrSamples:      number[] = [];
    let   hrWeightedSum   = 0;
    let   hrWeightedTotal = 0;
    let   totalDistanceMeters = 0;

    for (const rec of allRecords) {
      if (!rec.timestamp) continue;
      const timestamp = new Date(rec.timestamp as string);

      // Heart rate
      const hr = toNum(rec.heart_rate);

      // GPS
      const lat = toNum(rec.position_lat);
      const lon = toNum(rec.position_long);

      // Distance (running total — keep the max)
      const dist = toNum(rec.distance);
      if (dist !== null && dist > totalDistanceMeters) {
        totalDistanceMeters = dist;
      }

      // Altitude
      const altitude = toNum(rec.altitude);

      // Speed (fit-file-parser converts to m/s when speedUnit:'m/s')
      const speedMs = toNum(rec.speed);

      // Cadence — The FIT protocol defines the `cadence` field as strides/min
      // for one leg (same convention as Garmin). No conversion needed.
      const rawCadence = toNum(rec.cadence);
      // Treat 0 as undefined (stationary / not measured)
      const cadenceOneFoot =
        rawCadence !== null && rawCadence > 0
          ? rawCadence
          : undefined;

      if (hr !== null && hr > 0) {
        hrReadings.push({
          timestamp,
          heartRate: hr,
          speed:     speedMs   !== null && speedMs   >= 0 ? speedMs   : undefined,
          cadence:   cadenceOneFoot,
          altitude:  altitude  !== null               ? altitude  : undefined,
          watts:     undefined,   // Suunto walking FIT does not include power
          lat:       lat       !== null               ? lat       : undefined,
          lon:       lon       !== null               ? lon       : undefined,
        });

        hrSamples.push(hr);
        hrWeightedSum   += hr;
        hrWeightedTotal += 1;
      }

      if (speedMs !== null && speedMs > 0) speedSamples.push(speedMs);
      if (cadenceOneFoot !== undefined)     cadenceSamples.push(cadenceOneFoot);
    }

    if (hrReadings.length === 0) {
      console.warn('[SuuntoWorkoutParser] ⚠️ No HR readings found in FIT file');
      return null;
    }

    // Sort by timestamp (should already be sorted, but be safe)
    hrReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ── 4. Derive start / end times ────────────────────────────────────────
    const startTime = hrReadings[0].timestamp;
    const endTime   = new Date(startTime.getTime() + totalElapsedSec * 1000);

    // ── 5. Compute summary stats ───────────────────────────────────────────

    // Prefer session-level HR values (more accurate than re-computing from records)
    const avgHR = sessionAvgHR !== null
      ? Math.round(sessionAvgHR)
      : hrWeightedTotal > 0 ? Math.round(hrWeightedSum / hrWeightedTotal) : undefined;

    const minHR = sessionMinHR !== null
      ? sessionMinHR
      : hrSamples.length > 0 ? Math.min(...hrSamples) : undefined;

    const maxHR = sessionMaxHR !== null
      ? sessionMaxHR
      : hrSamples.length > 0 ? Math.max(...hrSamples) : undefined;

    // Speed — prefer session summary; fall back to record-level average
    const avgSpeedMs = sessionAvgSpeedMs !== null
      ? sessionAvgSpeedMs
      : speedSamples.length > 0 ? avg(speedSamples) : undefined;

    const maxSpeedMs = sessionMaxSpeedMs !== null
      ? sessionMaxSpeedMs
      : undefined;

    const avgSpeedKmh = avgSpeedMs !== undefined ? avgSpeedMs * 3.6 : undefined;
    const maxSpeedKmh = maxSpeedMs !== undefined ? maxSpeedMs * 3.6 : undefined;

    let avgPace: string | undefined;
    if (avgSpeedMs !== undefined && avgSpeedMs > 0) {
      avgPace = secondsToMMSS(1000 / avgSpeedMs);
    }

    // Cadence — FIT protocol stores cadence as strides/min for one leg,
    // so session avg_cadence is already in the one-foot convention.
    const avgCadence = sessionAvgCadence !== null
      ? Math.round(sessionAvgCadence)
      : cadenceSamples.length > 0 ? Math.round(avg(cadenceSamples)) : undefined;

    const totalDistanceKm = totalDistanceMeters > 0
      ? parseFloat((totalDistanceMeters / 1000).toFixed(3))
      : totalDistanceM > 0
        ? parseFloat((totalDistanceM / 1000).toFixed(3))
        : undefined;

    // ── 6. Date/time strings ───────────────────────────────────────────────
    const date    = startTime.toISOString().split('T')[0];
    const timeStr = startTime.toISOString().split('T')[1].split('.')[0];

    const workout: ISuuntoWorkout = {
      name:         `Suunto ${sport} - ${date}`,
      sport,
      sportType:    mapSportType(sport),
      date,
      startTimeStr: timeStr,
      startTime,
      endTime,
      durationSec:  Math.round(totalTimerSec),

      avgHeartRate:    avgHR,
      minHeartRate:    minHR ?? undefined,
      maxHeartRate:    maxHR ?? undefined,
      calories:        totalCalories || undefined,
      totalDistanceKm,
      avgSpeedKmh:     avgSpeedKmh !== undefined ? parseFloat(avgSpeedKmh.toFixed(2)) : undefined,
      maxSpeedKmh:     maxSpeedKmh !== undefined ? parseFloat(maxSpeedKmh.toFixed(2)) : undefined,
      avgPace,
      avgCadence,
      avgWatts:        undefined,
      maxWatts:        undefined,

      laps:      lapMetas,
      hrReadings,
    };

    console.log(`[SuuntoWorkoutParser] ✅ Parsed workout successfully:`);
    console.log(`   - Sport      : ${sport} (Luna type: ${workout.sportType})`);
    console.log(`   - Start      : ${startTime.toISOString()}`);
    console.log(`   - End        : ${endTime.toISOString()}`);
    console.log(`   - Duration   : ${workout.durationSec}s (${(workout.durationSec / 60).toFixed(1)} min)`);
    console.log(`   - Distance   : ${totalDistanceKm ?? 'N/A'} km`);
    console.log(`   - Calories   : ${totalCalories}`);
    console.log(`   - HR min/avg/max : ${minHR ?? 'N/A'} / ${avgHR ?? 'N/A'} / ${maxHR ?? 'N/A'} bpm`);
    console.log(`   - Avg pace   : ${avgPace ?? 'N/A'} min/km`);
    console.log(`   - Avg cadence: ${avgCadence ?? 'N/A'} spm (one-foot)`);
    console.log(`   - HR readings: ${hrReadings.length}`);
    console.log(`   - Laps       : ${lapMetas.length}`);

    return workout;
  }

  /**
   * Find overlap between a Suunto workout and a Luna workout time window.
   * Identical contract to GarminWorkoutParser.findWorkoutOverlap().
   */
  static findWorkoutOverlap(
    suuntoWorkout: ISuuntoWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPct: number = 50,
  ): { overlapPercent: number; isMatch: boolean } | null {

    const sStart  = suuntoWorkout.startTime.getTime();
    const sEnd    = suuntoWorkout.endTime.getTime();
    const lStart  = lunaStartTime.getTime();
    const lEnd    = lunaEndTime.getTime();

    const overlapStart = Math.max(sStart, lStart);
    const overlapEnd   = Math.min(sEnd,   lEnd);
    const overlapMs    = Math.max(0, overlapEnd - overlapStart);

    const lunaDuration = lEnd - lStart;
    if (lunaDuration <= 0) return null;

    const overlapPercent = (overlapMs / lunaDuration) * 100;

    console.log(`[SuuntoWorkoutParser] Overlap calculation:`);
    console.log(`   - Suunto: ${suuntoWorkout.startTime.toISOString()} → ${suuntoWorkout.endTime.toISOString()}`);
    console.log(`   - Luna  : ${lunaStartTime.toISOString()} → ${lunaEndTime.toISOString()}`);
    console.log(`   - Overlap: ${overlapPercent.toFixed(1)}% (threshold: ${minOverlapPct}%)`);

    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPct,
    };
  }

  /**
   * Extract HR readings that fall within [startTime, endTime].
   * Identical contract to GarminWorkoutParser.extractHRInTimeWindow().
   */
  static extractHRInTimeWindow(
    suuntoWorkout: ISuuntoWorkout,
    startTime: Date,
    endTime: Date,
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs   = endTime.getTime();

    return suuntoWorkout.hrReadings
      .filter(r => {
        const ts = r.timestamp.getTime();
        return ts >= startMs && ts <= endMs;
      })
      .map(r => ({ timestamp: r.timestamp, heartRate: r.heartRate }));
  }
}