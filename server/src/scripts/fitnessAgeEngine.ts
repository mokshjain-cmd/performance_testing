/**
 * Node/TS port of notes/unified_fitness_age_engine.py — the Gompertz-based
 * Fitness Age calculations, kept numerically identical to the Python spec.
 * This file is pure math/data-shaping and has no DB or Mongo dependency,
 * so it can be exercised independently of the ETL script that calls it.
 */

export interface DayRecord {
  date: string; // YYYY-MM-DD
  Sleep_Hours: number | null;
  Resting_HR: number | null;
  start_time: string | null;
  end_time: string | null;
  Strength_Hours: number | null;
  Z13_Cardio_Hours: number | null;
  Z45_Cardio_Hours: number | null;
  Steps: number | null;
}

export interface FitnessAgeMetricResult {
  value: number | null;
  target: number;
  delta_years?: number | null;
}

export interface FitnessAgeWindowResult {
  fitness_age: number | null;
  total_delta: number | null;
  pace_of_aging: number | null;
  metrics: {
    vo2_jackson: FitnessAgeMetricResult;
    vo2_ensemble: { value: number | null; target: number };
    resting_hr: FitnessAgeMetricResult;
    sleep_hours: FitnessAgeMetricResult;
    sleep_consistency: FitnessAgeMetricResult;
    daily_steps: FitnessAgeMetricResult;
    weekly_strength: FitnessAgeMetricResult;
  };
}

export type FitnessAgeWindowOutcome = FitnessAgeWindowResult | { error: string };

export interface Demographics {
  age: number;
  sex: 'male' | 'female';
  weight: number;
  height: number;
  genderMale: 0 | 1;
  bmi: number;
}

// ── Clinical VO2 estimator logic ──────────────────────────────────────────

export function calculateHrRatioModel(hrMax: number, rhrAvg: number | null): number | null {
  if (rhrAvg == null || Number.isNaN(rhrAvg) || rhrAvg <= 0 || hrMax <= 0) return null;
  return 15.3 * (hrMax / rhrAvg);
}

export function calculateJacksonPar(z13h: number, z45h: number, genderMale: 0 | 1): number {
  const activityScore = z13h * 1.5 + z45h * 2.0;
  const thresholds = genderMale
    ? [1.2, 2.4, 4.8, 8.0, 11.2, 14.4]
    : [0.96, 1.92, 3.84, 6.4, 8.96, 11.52];
  const [t2, t3, t4, t5, t6, t7] = thresholds;

  if (activityScore === 0) return 1;
  if (activityScore <= t2) return 2;
  if (activityScore <= t3) return 3;
  if (activityScore <= t4) return 4;
  if (activityScore <= t5) return 5;
  if (activityScore <= t6) return 6;
  if (activityScore <= t7) return 7;
  return 8;
}

export function calculateJacksonModel(
  age: number,
  genderMale: 0 | 1,
  bmi: number,
  par: number
): number {
  return 56.363 + 1.921 * par - 0.381 * age - 0.754 * bmi + 10.987 * genderMale;
}

export function ensembleVo2(
  hrMax: number,
  rhrAvg: number | null,
  age: number,
  genderMale: 0 | 1,
  bmi: number,
  par: number,
  weightHrr = 0.7,
  weightJackson = 0.3
): number {
  const vo2Hrr = calculateHrRatioModel(hrMax, rhrAvg);
  const vo2Jack = calculateJacksonModel(age, genderMale, bmi, par);
  if (vo2Hrr == null) return vo2Jack;
  return vo2Hrr * weightHrr + vo2Jack * weightJackson;
}

export function getAcsmVo2Baseline(age: number, genderMale: 0 | 1): number {
  if (genderMale) {
    if (age < 30) return 42.4;
    if (age < 40) return 40.9;
    if (age < 50) return 38.9;
    if (age < 60) return 35.7;
    if (age < 70) return 32.2;
    return 29.0;
  }
  if (age < 30) return 38.0;
  if (age < 40) return 34.0;
  if (age < 50) return 29.0;
  if (age < 60) return 24.5;
  if (age < 70) return 23.0;
  return 20.0;
}

// ── Time helpers ───────────────────────────────────────────────────────────

function parseTimeParts(timeStr: string): { h: number; m: number; s: number } | null {
  try {
    const raw = String(timeStr);
    const timePart = raw.includes('T') ? raw.split('T')[1].slice(0, 8) : raw;
    const parts = timePart.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parts.length > 2 ? Math.trunc(parseFloat(parts[2])) : 0;
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return { h, m, s: Number.isNaN(s) ? 0 : s };
  } catch {
    return null;
  }
}

export function parseTimeToHoursPastNoon(timeStr: string | null): number | null {
  if (timeStr == null) return null;
  const p = parseTimeParts(timeStr);
  if (!p) return null;
  let total = p.h + p.m / 60.0 + p.s / 3600.0;
  if (total < 12.0) total += 24.0;
  return total;
}

export function parseTimeToHoursPastMidnight(timeStr: string | null): number | null {
  if (timeStr == null) return null;
  const p = parseTimeParts(timeStr);
  if (!p) return null;
  return p.h + p.m / 60.0 + p.s / 3600.0;
}

// ── Small stats helpers (stand-ins for pandas) ─────────────────────────────

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function safeFloat(v: number | null | undefined): number | null {
  return v == null || Number.isNaN(v) ? null : v;
}

// ── Per-window calculation (port of _calculate_metrics_for_period) ────────

export function calculateMetricsForPeriod(
  periodDays: DayRecord[],
  demo: Demographics
): FitnessAgeWindowResult | null {
  if (periodDays.length === 0) return null;

  const { age, sex, genderMale, bmi } = demo;

  const stepDaysRaw = periodDays.filter((d) => d.Steps != null).length;
  const dayHasActSleepData = (d: DayRecord) =>
    d.Sleep_Hours != null ||
    d.Resting_HR != null ||
    d.Strength_Hours != null ||
    d.Z13_Cardio_Hours != null ||
    d.Z45_Cardio_Hours != null;
  const actSleepDaysRaw = periodDays.filter(dayHasActSleepData).length;

  const stepDays = stepDaysRaw === 0 ? 1 : stepDaysRaw;
  const actSleepDays = actSleepDaysRaw === 0 ? 1 : actSleepDaysRaw;

  const vo2Base = getAcsmVo2Baseline(age, genderMale);
  const RHR_BASE = age < 40 ? 60.0 : age < 60 ? 62.0 : age < 80 ? 64.0 : 66.0;
  const SLP_OPT_MAX = age < 65 ? 9.0 : 8.0;

  // RHR: median, floored at 40
  const validRhr = periodDays
    .map((d) => d.Resting_HR)
    .filter((v): v is number => v != null && v > 0);
  let avgRhr = median(validRhr);
  if (avgRhr != null) avgRhr = Math.max(avgRhr, 40.0);

  // Sleep: mean, excluding naps <= 3h
  const validSleep = periodDays
    .map((d) => d.Sleep_Hours)
    .filter((v): v is number => v != null && v > 3.0);
  const avgSleep = mean(validSleep);

  // Sleep consistency via MAD of onset/offset times
  let sleepCon: number | null = null;
  const conGroup = periodDays.filter((d) => d.Sleep_Hours != null && d.Sleep_Hours > 3.0);
  const validStart = conGroup.map((d) => d.start_time).filter((v): v is string => v != null);
  const validEnd = conGroup.map((d) => d.end_time).filter((v): v is string => v != null);
  if (validStart.length > 1 && validEnd.length > 1) {
    const startHours = validStart
      .map(parseTimeToHoursPastNoon)
      .filter((v): v is number => v != null);
    const endHours = validEnd
      .map(parseTimeToHoursPastMidnight)
      .filter((v): v is number => v != null);
    if (startHours.length > 1 && endHours.length > 1) {
      const startMedian = median(startHours)!;
      const endMedian = median(endHours)!;
      const startMad = mean(startHours.map((h) => Math.min(Math.abs(h - startMedian), 2.5)));
      const endMad = mean(endHours.map((h) => Math.min(Math.abs(h - endMedian), 2.5)));
      if (startMad != null && endMad != null) {
        const madAvgMinutes = ((startMad + endMad) / 2) * 60.0;
        sleepCon = Math.max(0.0, 100.0 - madAvgMinutes * 0.52);
      }
    }
  }

  // Wear-day averages
  const sumOf = (key: keyof DayRecord) =>
    periodDays.reduce((acc, d) => acc + ((d[key] as number | null) ?? 0), 0);

  const avgSteps = sumOf('Steps') / stepDays;
  const weeklyStr = (sumOf('Strength_Hours') / actSleepDays) * 7.0;
  const z13Weekly = (sumOf('Z13_Cardio_Hours') / actSleepDays) * 7.0;
  const z45Weekly = (sumOf('Z45_Cardio_Hours') / actSleepDays) * 7.0;

  // Core Jackson model
  const pa = calculateJacksonPar(z13Weekly, z45Weekly, genderMale);
  let vo2 = calculateJacksonModel(age, genderMale, bmi, pa);
  vo2 = Math.min(vo2, 70.0);

  const hrMax = 208 - 0.7 * age;
  let vo2Ens = avgRhr != null ? ensembleVo2(hrMax, avgRhr, age, genderMale, bmi, pa) : vo2;
  vo2Ens = Math.min(vo2Ens, 70.0);

  // Deltas
  const dtRhr = avgRhr != null ? (avgRhr - RHR_BASE) * 0.1 : 0.0;

  let dtSleep = 0.0;
  if (avgSleep != null) {
    if (avgSleep < 7.0) dtSleep = (7.0 - avgSleep) * 0.9;
    else if (avgSleep > SLP_OPT_MAX) dtSleep = (avgSleep - SLP_OPT_MAX) * 0.9;
    else dtSleep = -0.5;
  }

  const dtCon = sleepCon != null ? Math.max(-1.5, Math.min((70.0 - sleepCon) * 0.1, 2.5)) : 0.0;

  const dtSteps =
    avgSteps != null ? (8000.0 - Math.min(avgSteps, 16000.0)) * (0.3 / 1000.0) : 0.0;

  let dtStr = 0.0;
  if (weeklyStr != null) {
    const ws = Math.min(weeklyStr, 3.0);
    dtStr = ws < 0.67 ? (0.67 - ws) * 2.2 : (0.67 - ws) * 1.2;
  }

  const dtVo2 = vo2 != null ? (vo2Base - vo2) * (sex === 'female' ? 0.26 : 0.2) : 0.0;

  const totalDelta = dtRhr + dtSleep + dtCon + dtSteps + dtStr + dtVo2;
  const fitnessAge = age + totalDelta;

  return {
    fitness_age: safeFloat(fitnessAge),
    total_delta: safeFloat(totalDelta),
    pace_of_aging: safeFloat(fitnessAge / age),
    metrics: {
      vo2_jackson: { value: safeFloat(vo2), target: vo2Base, delta_years: safeFloat(dtVo2) },
      vo2_ensemble: { value: safeFloat(vo2Ens), target: vo2Base },
      resting_hr: { value: safeFloat(avgRhr), target: RHR_BASE, delta_years: safeFloat(dtRhr) },
      sleep_hours: { value: safeFloat(avgSleep), target: 7.0, delta_years: safeFloat(dtSleep) },
      sleep_consistency: {
        value: safeFloat(sleepCon),
        target: 70.0,
        delta_years: safeFloat(dtCon),
      },
      daily_steps: { value: safeFloat(avgSteps), target: 8000, delta_years: safeFloat(dtSteps) },
      weekly_strength: {
        value: safeFloat(weeklyStr),
        target: 0.67,
        delta_years: safeFloat(dtStr),
      },
    },
  };
}

export interface AllWindowsResult {
  status: 'success' | 'error';
  message?: string;
  demographics?: Demographics;
  windows: {
    sixtyDay: FitnessAgeWindowOutcome;
    sevenDay: FitnessAgeWindowOutcome;
  };
}

export function generateAllWindows(
  cleanDays: DayRecord[],
  demo: Demographics,
  endDate: Date
): AllWindowsResult {
  if (cleanDays.length === 0) {
    return {
      status: 'error',
      message: 'No valid data found in date range.',
      windows: {
        sixtyDay: { error: 'No valid data found in date range.' },
        sevenDay: { error: 'No valid data found in date range.' },
      },
    };
  }

  const endMs = endDate.getTime();
  const days = (n: number) => n * 24 * 60 * 60 * 1000;

  const df60 = cleanDays.filter((d) => {
    const t = new Date(d.date).getTime();
    return t >= endMs - days(60) && t <= endMs;
  });
  const df7 = cleanDays.filter((d) => {
    const t = new Date(d.date).getTime();
    return t >= endMs - days(7) && t <= endMs;
  });

  const sixtyDay: FitnessAgeWindowOutcome =
    df60.length >= 20
      ? calculateMetricsForPeriod(df60, demo)!
      : { error: `Not enough data. Found ${df60.length}/20 required days.` };

  const sevenDay: FitnessAgeWindowOutcome =
    df7.length >= 3
      ? calculateMetricsForPeriod(df7, demo)!
      : { error: `Not enough data. Found ${df7.length}/3 required days.` };

  return {
    status: 'success',
    demographics: demo,
    windows: { sixtyDay, sevenDay },
  };
}
