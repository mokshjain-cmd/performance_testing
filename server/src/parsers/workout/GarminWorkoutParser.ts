import * as fs from 'fs';
import { XMLParser } from 'fast-xml-parser';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/**
 * Parsed workout from Garmin TCX export.
 * Structure mirrors IPolarWorkout so the downstream pipeline (IngestWorkoutService)
 * can consume it without any changes.
 */
export interface IGarminWorkout {
  // ── Identity ──────────────────────────────────────────────────────────────
  name: string;
  sport: string;                // Raw TCX sport string (e.g. "Running")
  sportType: number;            // Mapped Luna sport type (matches Polar/Coros convention)
  date: string;                 // YYYY-MM-DD
  startTimeStr: string;         // HH:MM:SS (UTC)
  startTime: Date;
  endTime: Date;
  durationSec: number;

  // ── Summary stats ─────────────────────────────────────────────────────────
  avgHeartRate?: number;        // bpm  (weighted avg across all trackpoints)
  minHeartRate?: number;        // bpm  (global min across all trackpoints)
  maxHeartRate?: number;        // bpm  (global max across laps)
  calories?: number;            // kcal (sum of all laps)
  totalDistanceKm?: number;     // km   (from last trackpoint DistanceMeters)
  avgSpeedKmh?: number;         // km/h (computed from trackpoints)
  maxSpeedKmh?: number;         // km/h (global max across laps, converted from m/s)
  avgPace?: string;             // min/km string "MM:SS"
  avgCadence?: number;          // steps/min (one foot — Garmin RunCadence convention)
  avgWatts?: number;            // running power (if device supports it)
  maxWatts?: number;

  // ── Per-lap metadata (useful for analysis, not used by downstream) ────────
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
    speed?: number;             // m/s (same unit as Polar for consistency)
    cadence?: number;           // steps/min (one foot)
    altitude?: number;          // metres
    watts?: number;
    lat?: number;
    lon?: number;
  }>;
}

// ─── Garmin TCX Sport → Luna sport type mapping ───────────────────────────────
//
// TCX `Sport` attribute has only three values: Running | Biking | Other.
// Garmin Connect's extended sport names come through the `<Id>` field prefix
// or the `<Activity Sport="...">` attribute when exported from Garmin Connect.
// We map all known variants to Luna sport type IDs (same table used by Polar/Coros).
//
// Luna sport type reference (from Android SDK getSportName()):
//   1=Running, 2=Walking, 4=Hiking, 6=Cycling, 7=IndoorCycling,
//   9=Basketball, 10=Soccer, 11=TableTennis, 12=Badminton, 13=Hiking,
//   21=Swimming, 22=OpenWaterSwim, 23=CoreTraining, 25=StrengthTraining,
//   26=Stretching, 28=Pilates, 34=Elliptical, 35=Yoga, 52=Dance,
//   56=Boxing, 62=MartialArts, 64=HIIT, 66=Treadmill, 84=CrossFit,
//   85=Aerobics, 94=FunctionalTraining, 105=Tennis, 121=Rowing,
//   122=JumpRope, 123=Triathlon, 124=MountainBiking, 125=Kickboxing,
//   134=Golf, 135=IndoorWalking, 139=Marathon, 150=Meditation, 0=Other

const GARMIN_SPORT_TO_LUNA: Record<string, number> = {
  // ── Running family ──────────────────────────────────────────────────────
  'running':                    1,
  'outdoor_running':            1,
  'run':                        1,
  'trail_running':              1,
  'track_running':              1,
  'virtual_run':                1,
  'ultra_run':                  1,
  'obstacle_run':               1,
  'treadmill_running':          66,
  'treadmill':                  66,
  'indoor_running':             66,
  'marathon':                   139,
  'half_marathon':              139,
  'race':                       1,

  // ── Walking family ──────────────────────────────────────────────────────
  'walking':                    2,
  'outdoor_walking':            2,
  'casual_walking':             2,
  'speed_walking':              2,
  'indoor_walking':             135,

  // ── Hiking ──────────────────────────────────────────────────────────────
  'hiking':                     13,
  'mountaineering':             13,

  // ── Cycling family ──────────────────────────────────────────────────────
  'biking':                     6,
  'cycling':                    6,
  'road_biking':                6,
  'road_cycling':               6,
  'gravel_cycling':             6,
  'mountain_biking':            124,
  'mountain_bike':              124,
  'bmx':                        124,
  'indoor_cycling':             7,
  'virtual_ride':               7,
  'spinning':                   7,
  'cyclocross':                 6,

  // ── Swimming ────────────────────────────────────────────────────────────
  'swimming':                   21,
  'pool_swimming':              21,
  'lap_swimming':               21,
  'open_water_swimming':        22,
  'open_water':                 22,

  // ── Gym / Fitness ────────────────────────────────────────────────────────
  'strength_training':          25,
  'weight_training':            25,
  'functional_strength_training': 94,
  'functional_training':        94,
  'core_training':              23,
  'cardio_training':            64,
  'hiit':                       64,
  'high_intensity_interval_training': 64,
  'circuit_training':           64,
  'crossfit':                   84,
  'cross_training':             84,
  'elliptical':                 34,
  'stair_climbing':             34,
  'rowing':                     121,
  'rowing_machine':             121,
  'indoor_rowing':              121,
  'jump_rope':                  122,
  'pilates':                    28,
  'yoga':                       35,
  'barre':                      35,
  'aerobics':                   85,
  'dance':                      52,
  'zumba':                      52,
  'boxing':                     56,
  'kickboxing':                 125,
  'martial_arts':               62,
  'stretching':                 26,
  'meditation':                 150,
  'breathwork':                 150,

  // ── Ball Sports ──────────────────────────────────────────────────────────
  'basketball':                 9,
  'soccer':                     10,
  'football':                   10,
  'tennis':                     105,
  'table_tennis':               11,
  'badminton':                  12,
  'squash':                     42,
  'volleyball':                 45,
  'cricket':                    39,
  'golf':                       134,

  // ── Multi-sport ──────────────────────────────────────────────────────────
  'triathlon':                  123,
  'duathlon':                   123,
  'multisport':                 123,

  // ── Other / Unknown ──────────────────────────────────────────────────────
  'other':                      0,
  'generic':                    0,
};

/**
 * Normalise a raw Garmin sport string to a lookup key.
 * Handles spaces, mixed case, and underscores.
 */
function normaliseSport(raw: string): string {
  return raw.toLowerCase().replace(/[\s\-]+/g, '_').trim();
}

function mapSportType(garminSport: string): number {
  const key = normaliseSport(garminSport);
  return GARMIN_SPORT_TO_LUNA[key] ?? 0;
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
 * GarminWorkoutParser
 *
 * Parses Garmin TCX files exported from Garmin Connect (or compatible devices).
 * Produces IGarminWorkout — structurally identical to IPolarWorkout — so
 * IngestWorkoutService can consume it through the same processCorosBenchmarkHR /
 * processPolarBenchmarkHR pathway without modification.
 *
 * TCX timestamps are ISO-8601 UTC — no timezone conversion is needed
 * (contrast with Polar CSV which is in IST).
 *
 * Install dependency: npm install fast-xml-parser
 */
export class GarminWorkoutParser {

  // ── Public API (mirrors PolarWorkoutParser exactly) ───────────────────────

  /**
   * Parse a Garmin .tcx file into IGarminWorkout.
   * Returns null if the file cannot be parsed or contains no HR data.
   */
  static async parseWorkout(filePath: string): Promise<IGarminWorkout | null> {
    console.log(`[GarminWorkoutParser] Parsing file: ${filePath}`);

    const xml = fs.readFileSync(filePath, 'utf-8');

    const parser = new XMLParser({
      ignoreAttributes:    false,
      attributeNamePrefix: '@_',
      isArray: (name) => ['Lap', 'Trackpoint', 'Activity', 'Track'].includes(name),
    });

    const doc = parser.parse(xml);
    const db  = doc['TrainingCenterDatabase'];

    if (!db?.Activities?.Activity) {
      console.warn('[GarminWorkoutParser] ⚠️ No Activities found in TCX file');
      return null;
    }

    const activities = Array.isArray(db.Activities.Activity)
      ? db.Activities.Activity
      : [db.Activities.Activity];

    // Take the first (and usually only) activity
    const act = activities[0] as Record<string, unknown>;

    const sport      = (act['@_Sport'] as string) || 'Other';
    const activityId = act['Id'] as string;           // ISO timestamp = global start time
    const lapsRaw    = (act['Lap'] as Record<string, unknown>[]) ?? [];

    if (lapsRaw.length === 0) {
      console.warn('[GarminWorkoutParser] ⚠️ No laps found in activity');
      return null;
    }

    // ── 1. Parse lap summaries ─────────────────────────────────────────────
    let totalCalories      = 0;
    let totalDurationSec   = 0;
    let globalMaxSpeedMs   = 0;
    let globalMaxHR        = 0;

    const lapMetas: IGarminWorkout['laps'] = [];

    for (const lap of lapsRaw) {
      const lapStartTime  = new Date(lap['@_StartTime'] as string);
      const durationSec   = toNum(lap['TotalTimeSeconds']) ?? 0;
      const distanceM     = toNum(lap['DistanceMeters'])   ?? 0;
      const calories      = toNum(lap['Calories'])         ?? 0;
      const maxSpeedMs    = toNum(lap['MaximumSpeed'])     ?? 0;

      const avgHrEl = lap['AverageHeartRateBpm'] as Record<string, unknown> | undefined;
      const maxHrEl = lap['MaximumHeartRateBpm'] as Record<string, unknown> | undefined;
      const lapAvgHR = avgHrEl ? (toNum(avgHrEl['Value']) ?? undefined) : undefined;
      const lapMaxHR = maxHrEl ? (toNum(maxHrEl['Value']) ?? undefined) : undefined;

      totalCalories    += calories;
      totalDurationSec += durationSec;
      if (maxSpeedMs > globalMaxSpeedMs) globalMaxSpeedMs = maxSpeedMs;
      if (lapMaxHR && lapMaxHR > globalMaxHR) globalMaxHR = lapMaxHR;

      lapMetas.push({
        startTime:       lapStartTime,
        durationSec:     Math.round(durationSec),
        distanceMeters:  distanceM,
        calories:        calories,
        avgHeartRate:    lapAvgHR ?? undefined,
        maxHeartRate:    lapMaxHR ?? undefined,
        maxSpeedMs:      maxSpeedMs || undefined,
      });
    }

    // ── 2. Flatten all trackpoints across every lap ────────────────────────
    const hrReadings: IGarminWorkout['hrReadings'] = [];

    let totalDistanceMeters = 0;
    const speedSamples:   number[] = [];
    const cadenceSamples: number[] = [];
    const wattsSamples:   number[] = [];
    const hrSamples:      number[] = [];
    // Weighted HR sum for proper avg (duration-weighted by lap)
    let   hrWeightedSum   = 0;
    let   hrWeightedTotal = 0;

    for (const lap of lapsRaw) {
      const tracksRaw = lap['Track'];
      if (!tracksRaw) continue;

      const tracks = Array.isArray(tracksRaw)
        ? (tracksRaw as Record<string, unknown>[])
        : [tracksRaw as Record<string, unknown>];

      for (const track of tracks) {
        const tpsRaw = track['Trackpoint'];
        if (!tpsRaw) continue;

        const tps = Array.isArray(tpsRaw)
          ? (tpsRaw as Record<string, unknown>[])
          : [tpsRaw as Record<string, unknown>];

        for (const tp of tps) {
          const time = tp['Time'] as string;
          if (!time) continue;
          const timestamp = new Date(time);

          // Heart Rate
          const hrEl = tp['HeartRateBpm'] as Record<string, unknown> | undefined;
          const hr   = hrEl ? toNum(hrEl['Value']) : null;

          // GPS
          const pos = tp['Position'] as Record<string, unknown> | undefined;
          const lat = pos ? toNum(pos['LatitudeDegrees'])  : null;
          const lon = pos ? toNum(pos['LongitudeDegrees']) : null;

          // Distance (running total — keep the max across all trackpoints)
          const dist = toNum(tp['DistanceMeters']);
          if (dist !== null && dist > totalDistanceMeters) {
            totalDistanceMeters = dist;
          }

          // Altitude
          const altitude = toNum(tp['AltitudeMeters']);

          // Extensions: Speed (m/s), RunCadence (steps/min one foot), Watts
          let speed:   number | undefined;
          let cadence: number | undefined;
          let watts:   number | undefined;

          const ext = tp['Extensions'] as Record<string, unknown> | undefined;
          if (ext) {
            // fast-xml-parser may preserve namespace prefix or strip it
            const tpx = (ext['ns3:TPX'] ?? ext['TPX']) as Record<string, unknown> | undefined;
            if (tpx) {
              const rawSpeed   = toNum(tpx['ns3:Speed']       ?? tpx['Speed']);
              const rawCadence = toNum(tpx['ns3:RunCadence']  ?? tpx['RunCadence']);
              const rawWatts   = toNum(tpx['ns3:Watts']       ?? tpx['Watts']);

              if (rawSpeed   !== null && rawSpeed   >= 0) speed   = rawSpeed;
              if (rawCadence !== null && rawCadence >  0) cadence = rawCadence;
              if (rawWatts   !== null && rawWatts   >  0) watts   = rawWatts;
            }
          }

          // Only add to hrReadings when we have a valid HR value
          if (hr !== null && hr > 0) {
            hrReadings.push({
              timestamp,
              heartRate: hr,
              speed,
              cadence:   cadence ?? undefined,
              altitude:  altitude ?? undefined,
              watts:     watts ?? undefined,
              lat:       lat ?? undefined,
              lon:       lon ?? undefined,
            });

            hrSamples.push(hr);
            hrWeightedSum   += hr;
            hrWeightedTotal += 1;
          }

          if (speed   !== undefined) speedSamples.push(speed);
          if (cadence !== undefined) cadenceSamples.push(cadence);
          if (watts   !== undefined) wattsSamples.push(watts);
        }
      }
    }

    if (hrReadings.length === 0) {
      console.warn('[GarminWorkoutParser] ⚠️ No HR readings found in TCX file');
      return null;
    }

    // Sort by timestamp (laps should already be ordered, but be safe)
    hrReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ── 3. Derive global start / end from first & last HR reading ──────────
    const startTime = hrReadings[0].timestamp;
    const endTime   = new Date(startTime.getTime() + totalDurationSec * 1000);

    // ── 4. Compute summary stats ───────────────────────────────────────────
    const avgHR =
      hrWeightedTotal > 0
        ? Math.round(hrWeightedSum / hrWeightedTotal)
        : undefined;

    const minHR = hrSamples.length > 0 ? Math.min(...hrSamples) : undefined;

    const maxHR = globalMaxHR > 0
      ? globalMaxHR
      : hrSamples.length > 0 ? Math.max(...hrSamples) : undefined;

    const avgSpeedMs  = speedSamples.length > 0 ? avg(speedSamples) : undefined;
    const avgSpeedKmh = avgSpeedMs !== undefined ? avgSpeedMs * 3.6 : undefined;
    const maxSpeedKmh = globalMaxSpeedMs > 0     ? globalMaxSpeedMs * 3.6 : undefined;

    // Pace: min/km from avg speed
    let avgPace: string | undefined;
    if (avgSpeedMs !== undefined && avgSpeedMs > 0) {
      const secPerKm = 1000 / avgSpeedMs;
      avgPace = secondsToMMSS(secPerKm);
    }

    const avgCadence = cadenceSamples.length > 0
      ? Math.round(avg(cadenceSamples))
      : undefined;

    const avgWatts = wattsSamples.length > 0
      ? Math.round(avg(wattsSamples))
      : undefined;

    const maxWatts = wattsSamples.length > 0
      ? Math.max(...wattsSamples)
      : undefined;

    const totalDistanceKm =
      totalDistanceMeters > 0
        ? parseFloat((totalDistanceMeters / 1000).toFixed(3))
        : undefined;

    // ── 5. Derive date/time strings ────────────────────────────────────────
    const date       = startTime.toISOString().split('T')[0];   // YYYY-MM-DD
    const timeStr    = startTime.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS

    const workout: IGarminWorkout = {
      name:            `Garmin ${sport} - ${date}`,
      sport,
      sportType:       mapSportType(sport),
      date,
      startTimeStr:    timeStr,
      startTime,
      endTime,
      durationSec:     Math.round(totalDurationSec),

      avgHeartRate:    avgHR,
      minHeartRate:    minHR,
      maxHeartRate:    maxHR,
      calories:        totalCalories || undefined,
      totalDistanceKm,
      avgSpeedKmh:     avgSpeedKmh !== undefined ? parseFloat(avgSpeedKmh.toFixed(2)) : undefined,
      maxSpeedKmh:     maxSpeedKmh !== undefined ? parseFloat(maxSpeedKmh.toFixed(2)) : undefined,
      avgPace,
      avgCadence,
      avgWatts,
      maxWatts:        maxWatts !== undefined ? Math.round(maxWatts) : undefined,

      laps:            lapMetas,
      hrReadings,
    };

    console.log(`[GarminWorkoutParser] ✅ Parsed workout successfully:`);
    console.log(`   - Sport      : ${sport} (Luna type: ${workout.sportType})`);
    console.log(`   - Start      : ${startTime.toISOString()}`);
    console.log(`   - End        : ${endTime.toISOString()}`);
    console.log(`   - Duration   : ${Math.round(totalDurationSec)}s`);
    console.log(`   - Distance   : ${totalDistanceKm ?? 'N/A'} km`);
    console.log(`   - Calories   : ${totalCalories}`);
    console.log(`   - HR min/avg/max : ${minHR ?? 'N/A'} / ${avgHR ?? 'N/A'} / ${maxHR ?? 'N/A'} bpm`);
    console.log(`   - Avg pace   : ${avgPace ?? 'N/A'} min/km`);
    console.log(`   - Avg cadence: ${avgCadence ?? 'N/A'} spm`);
    console.log(`   - HR readings: ${hrReadings.length}`);
    console.log(`   - Laps       : ${lapMetas.length}`);

    return workout;
  }

  /**
   * Find overlap between a Garmin workout and a Luna workout time window.
   * Identical contract to PolarWorkoutParser.findWorkoutOverlap().
   *
   * @param garminWorkout   Parsed Garmin workout
   * @param lunaStartTime   Luna workout start time
   * @param lunaEndTime     Luna workout end time
   * @param minOverlapPct   Minimum overlap % required (default 50)
   */
  static findWorkoutOverlap(
    garminWorkout: IGarminWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPct: number = 50,
  ): { overlapPercent: number; isMatch: boolean } | null {

    const gStart   = garminWorkout.startTime.getTime();
    const gEnd     = garminWorkout.endTime.getTime();
    const lStart   = lunaStartTime.getTime();
    const lEnd     = lunaEndTime.getTime();

    const overlapStart = Math.max(gStart, lStart);
    const overlapEnd   = Math.min(gEnd,   lEnd);
    const overlapMs    = Math.max(0, overlapEnd - overlapStart);

    const lunaDuration = lEnd - lStart;
    if (lunaDuration <= 0) return null;

    const overlapPercent = (overlapMs / lunaDuration) * 100;

    console.log(`[GarminWorkoutParser] Overlap calculation:`);
    console.log(`   - Garmin: ${garminWorkout.startTime.toISOString()} → ${garminWorkout.endTime.toISOString()}`);
    console.log(`   - Luna  : ${lunaStartTime.toISOString()} → ${lunaEndTime.toISOString()}`);
    console.log(`   - Overlap: ${overlapPercent.toFixed(1)}% (threshold: ${minOverlapPct}%)`);

    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPct,
    };
  }

  /**
   * Extract HR readings that fall within [startTime, endTime].
   * Identical contract to PolarWorkoutParser.extractHRInTimeWindow().
   *
   * @param garminWorkout Parsed Garmin workout
   * @param startTime     Window start (inclusive)
   * @param endTime       Window end   (inclusive)
   */
  static extractHRInTimeWindow(
    garminWorkout: IGarminWorkout,
    startTime: Date,
    endTime: Date,
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs   = endTime.getTime();

    return garminWorkout.hrReadings
      .filter(r => {
        const ts = r.timestamp.getTime();
        return ts >= startMs && ts <= endMs;
      })
      .map(r => ({
        timestamp:  r.timestamp,
        heartRate:  r.heartRate,
      }));
  }
}