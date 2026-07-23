/**
 * Node/TS port of notes/unified_fitness_age_engine.py — the Fitness Age
 * calculations, kept numerically identical to the Python spec.
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
  Max_HR: number | null;
  Steps: number | null;
}

export interface FitnessAgeMetricResult {
  value: number | null;
  target: number;
  delta_years?: number | null;
}

export interface FitnessAgeEnsembleResult {
  value: number | null;
  target: number;
  delta_years: number | null;
  bracket: string;
  jack_weight: number;
  hrr_weight: number;
}

export interface FitnessAgeWindowResult {
  fitness_age: number | null;
  total_delta: number | null;
  pace_of_aging: number | null;
  metrics: {
    vo2_jackson: { value: number | null; target: number };
    vo2_hrr: { value: number | null; target: number };
    vo2_legacy: { value: number | null; target: number };
    vo2_ensemble: FitnessAgeEnsembleResult;
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
  if (Number.isNaN(z13h)) z13h = 0.0;
  if (Number.isNaN(z45h)) z45h = 0.0;

  const activityScore = z13h * 1.5 + z45h * 2.0;

  let basePa = 1.0;
  if (genderMale) {
    if (activityScore > 13.1) basePa = 10.0;
    else if (activityScore > 11.5) basePa = 9.5;
    else if (activityScore > 9.9) basePa = 9.0;
    else if (activityScore > 9.3) basePa = 8.5;
    else if (activityScore > 8.4) basePa = 8.0;
    else if (activityScore > 7.3) basePa = 7.5;
    else if (activityScore > 6.7) basePa = 7.0;
    else if (activityScore > 5.95) basePa = 6.5;
    else if (activityScore > 5.2) basePa = 6.0;
    else if (activityScore > 4.35) basePa = 5.5;
    else if (activityScore > 3.5) basePa = 5.0;
    else if (activityScore > 2.8) basePa = 4.5;
    else if (activityScore > 2.1) basePa = 4.0;
    else if (activityScore > 1.5) basePa = 3.5;
    else if (activityScore > 0.9) basePa = 3.0;
    else if (activityScore > 0.45) basePa = 2.5;
    else if (activityScore > 0) basePa = 2.0;
  } else {
    // Women's thresholds scaled by 20%
    if (activityScore > 10.48) basePa = 10.0;
    else if (activityScore > 9.2) basePa = 9.5;
    else if (activityScore > 7.92) basePa = 9.0;
    else if (activityScore > 7.44) basePa = 8.5;
    else if (activityScore > 6.72) basePa = 8.0;
    else if (activityScore > 5.84) basePa = 7.5;
    else if (activityScore > 5.36) basePa = 7.0;
    else if (activityScore > 4.76) basePa = 6.5;
    else if (activityScore > 4.16) basePa = 6.0;
    else if (activityScore > 3.48) basePa = 5.5;
    else if (activityScore > 2.8) basePa = 5.0;
    else if (activityScore > 2.24) basePa = 4.5;
    else if (activityScore > 1.68) basePa = 4.0;
    else if (activityScore > 1.2) basePa = 3.5;
    else if (activityScore > 0.72) basePa = 3.0;
    else if (activityScore > 0.36) basePa = 2.5;
    else if (activityScore > 0) basePa = 2.0;
  }

  // The Vigorous Waterfall Demotion Gates
  const baseGates: Record<string, number> = {
    '10': 3.0,
    '9.5': 2.5,
    '9': 2.0,
    '8.5': 1.5,
    '8': 1.0,
    '7.5': 0.5,
    '7': 0.0,
  };
  // Scale gates down by 20% for women to maintain proportional intensity burden
  const vigorousGates: Record<string, number> = genderMale
    ? baseGates
    : Object.fromEntries(Object.entries(baseGates).map(([k, v]) => [k, v * 0.8]));

  let currentPa = basePa;
  while (currentPa > 7.0) {
    const key = String(currentPa);
    if (key in vigorousGates && z45h >= vigorousGates[key]) {
      return currentPa;
    }
    currentPa -= 0.5;
  }
  return currentPa;
}

export function calculateJacksonModel(
  age: number,
  genderMale: 0 | 1,
  bmi: number,
  par: number
): number {
  return 56.363 + 1.921 * par - 0.381 * age - 0.754 * bmi + 10.987 * genderMale;
}

export interface EnsembleVo2Result {
  vo2Ens: number;
  vo2Jack: number;
  vo2Hrr: number | null;
  vo2Legacy: number | null;
  bracket: string;
  jackWeight: number;
  hrrWeight: number;
}

export function ensembleVo2(
  hrMax: number,
  rhrAvg: number | null,
  age: number,
  genderMale: 0 | 1,
  bmi: number,
  par: number
): EnsembleVo2Result {
  const vo2Hrr = calculateHrRatioModel(hrMax, rhrAvg);
  const vo2Jack = calculateJacksonModel(age, genderMale, bmi, par);

  let vo2Legacy: number | null = null;
  let vo2Ens = vo2Jack;
  let bracket = 'None';
  let jackWeight = 1.0;
  let hrrWeight = 0.0;

  if (vo2Hrr != null) {
    vo2Legacy = vo2Hrr * 0.7 + vo2Jack * 0.3;

    if (vo2Jack > vo2Hrr) {
      bracket = 'Bracket 0: Jackson Override';
      jackWeight = 1.0;
      hrrWeight = 0.0;
      vo2Ens = vo2Jack;
    } else if (vo2Hrr - vo2Jack > 4.0) {
      bracket = 'Bracket 1: High HRR Efficiency';
      jackWeight = 0.2;
      hrrWeight = 0.8;
      vo2Ens = vo2Hrr * hrrWeight + vo2Jack * jackWeight;
    } else {
      bracket = 'Static Baseline (70/30)';
      jackWeight = 0.7;
      hrrWeight = 0.3;
      vo2Ens = vo2Hrr * hrrWeight + vo2Jack * jackWeight;
    }
  }

  return { vo2Ens, vo2Jack, vo2Hrr, vo2Legacy, bracket, jackWeight, hrrWeight };
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

  // Wear day denominators (strictly filtering noise to avoid poisoning)
  const gt0 = (v: number | null): boolean => v != null && v > 0;
  const stepDaysRaw = periodDays.filter((d) => d.Steps != null && d.Steps >= 200).length;
  const actSleepDaysRaw = periodDays.filter(
    (d) =>
      gt0(d.Sleep_Hours) ||
      gt0(d.Resting_HR) ||
      gt0(d.Strength_Hours) ||
      gt0(d.Z13_Cardio_Hours) ||
      gt0(d.Z45_Cardio_Hours)
  ).length;

  const stepDays = stepDaysRaw === 0 ? 1 : stepDaysRaw;
  const actSleepDays = actSleepDaysRaw === 0 ? 1 : actSleepDaysRaw;

  const vo2Base = getAcsmVo2Baseline(age, genderMale);
  const RHR_BASE = age < 40 ? 60.0 : age < 60 ? 62.0 : age < 80 ? 64.0 : 66.0;
  const SLP_OPT_MAX = age < 65 ? 9.0 : 8.0;

  // RHR uses median (floored at 40, rounded), Sleep uses mean (excluding micro-naps)
  const validRhr = periodDays
    .map((d) => d.Resting_HR)
    .filter((v): v is number => v != null && v > 0);
  let avgRhr = median(validRhr);
  if (avgRhr != null) {
    avgRhr = Math.max(avgRhr, 40.0);
    avgRhr = Math.round(avgRhr);
  }

  const validSleep = periodDays
    .map((d) => d.Sleep_Hours)
    .filter((v): v is number => v != null && v >= 3.0 && v <= 17.0);
  const avgSleep = mean(validSleep);

  // Sleep Consistency via MAD (Median Absolute Deviation)
  let sleepCon: number | null = null;
  const conGroup = periodDays.filter(
    (d) => d.Sleep_Hours != null && d.Sleep_Hours >= 3.0 && d.Sleep_Hours <= 17.0
  );
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

  // Experimental Dynamic Ensemble Model
  const tanakaHr = 208 - 0.7 * age;
  const validMaxHr = periodDays
    .map((d) => d.Max_HR)
    .filter((v): v is number => v != null && v > 0);
  let windowMaxHr: number | null = null;
  if (validMaxHr.length >= 3) {
    const top3 = [...validMaxHr].sort((a, b) => b - a).slice(0, 3);
    windowMaxHr = mean(top3);
  } else if (validMaxHr.length > 0) {
    windowMaxHr = Math.max(...validMaxHr);
  }
  const finalMaxHr = windowMaxHr != null ? Math.max(tanakaHr, windowMaxHr) : tanakaHr;

  let vo2Ens: number;
  let vo2Jack: number;
  let vo2Hrr: number | null;
  let vo2Legacy: number | null;
  let bracket: string;
  let jackWeight: number;
  let hrrWeight: number;
  if (avgRhr != null) {
    const ens = ensembleVo2(finalMaxHr, avgRhr, age, genderMale, bmi, pa);
    ({ vo2Ens, vo2Jack, vo2Hrr, vo2Legacy, bracket, jackWeight, hrrWeight } = ens);
  } else {
    vo2Ens = vo2;
    vo2Jack = vo2;
    vo2Hrr = null;
    vo2Legacy = null;
    bracket = 'None';
    jackWeight = 0.0;
    hrrWeight = 0.0;
  }
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

  // dt_vo2 uses the final Dynamic Ensemble VO2 (not the pure Jackson baseline)
  const dtVo2 = vo2Ens != null ? (vo2Base - vo2Ens) * (sex === 'female' ? 0.26 : 0.2) : 0.0;

  const totalDelta = dtRhr + dtSleep + dtCon + dtSteps + dtStr + dtVo2;
  const fitnessAge = age + totalDelta;

  return {
    fitness_age: safeFloat(fitnessAge),
    total_delta: safeFloat(totalDelta),
    pace_of_aging: safeFloat(fitnessAge / age),
    metrics: {
      vo2_jackson: { value: safeFloat(vo2Jack), target: vo2Base },
      vo2_hrr: { value: safeFloat(vo2Hrr), target: vo2Base },
      vo2_legacy: { value: safeFloat(vo2Legacy), target: vo2Base },
      vo2_ensemble: {
        value: safeFloat(vo2Ens),
        target: vo2Base,
        delta_years: safeFloat(dtVo2),
        bracket,
        jack_weight: safeFloat(jackWeight) ?? 0.0,
        hrr_weight: safeFloat(hrrWeight) ?? 0.0,
      },
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
