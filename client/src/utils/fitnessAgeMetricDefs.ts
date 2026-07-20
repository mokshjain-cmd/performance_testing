export type MetricKey =
  | 'vo2_jackson'
  | 'resting_hr'
  | 'sleep_hours'
  | 'sleep_consistency'
  | 'daily_steps'
  | 'weekly_strength';

export interface MetricDef {
  key: MetricKey;
  name: string;
  subtitle?: string;
  unit: string;
  range: [number, number];
  betterLow?: boolean;
  topic: string;
  goodDesc: string;
  warnDesc: string;
}

export const METRIC_DEFS: Record<MetricKey, MetricDef> = {
  vo2_jackson: {
    key: 'vo2_jackson',
    name: 'VO₂ Max',
    unit: 'ml/kg/min',
    range: [15, 70],
    topic: 'aerobic fitness',
    goodDesc: 'Excellent aerobic capacity, actively lowering Fitness Age. Sustained cardio keeps this edge.',
    warnDesc: 'Aerobic capacity is on the low side. Sustained runs or cycling would raise this and pull Fitness Age down.',
  },
  resting_hr: {
    key: 'resting_hr',
    name: 'Resting Heart Rate',
    unit: 'bpm',
    range: [40, 80],
    betterLow: true,
    topic: 'resting heart rate',
    goodDesc: 'A low resting heart rate signals strong cardiac efficiency.',
    warnDesc: 'Resting heart rate is elevated. Recovery sleep and easy aerobic work help bring it down.',
  },
  sleep_hours: {
    key: 'sleep_hours',
    name: 'Sleep Duration',
    unit: 'hrs',
    range: [3, 10],
    topic: 'sleep duration',
    goodDesc: 'Solid nightly duration in the optimal range.',
    warnDesc: 'Sleep duration is outside the optimal range. Even one extra hour a night measurably helps.',
  },
  sleep_consistency: {
    key: 'sleep_consistency',
    name: 'Sleep Consistency',
    unit: '%',
    range: [0, 100],
    topic: 'sleep consistency',
    goodDesc: 'Very consistent sleep timing, protecting circadian rhythm.',
    warnDesc: 'Sleep timing is inconsistent. A fixed bed and wake time pushes this toward target.',
  },
  daily_steps: {
    key: 'daily_steps',
    name: 'Daily Steps',
    unit: 'steps/day',
    range: [0, 16000],
    topic: 'daily activity',
    goodDesc: 'Healthy daily step count keeps metabolism active throughout the day.',
    warnDesc: 'Step count is below target. A 20–30 minute daily walk closes the gap quickly.',
  },
  weekly_strength: {
    key: 'weekly_strength',
    name: 'Weekly Strength',
    subtitle: 'Weekly',
    unit: 'hrs/wk',
    range: [0, 3],
    topic: 'strength training',
    goodDesc: 'Solid weekly strength work, trimming Fitness Age and preserving lean mass.',
    warnDesc: 'Strength volume is light. Building toward ~40 minutes/week amplifies the benefit.',
  },
};

export const METRIC_GROUPS: { key: string; label: string; metrics: MetricKey[] }[] = [
  { key: 'fitness', label: 'Fitness', metrics: ['vo2_jackson', 'resting_hr'] },
  { key: 'sleep', label: 'Sleep', metrics: ['sleep_hours', 'sleep_consistency'] },
  { key: 'activity', label: 'Activity', metrics: ['daily_steps', 'weekly_strength'] },
];

export type MetricStatus = 'outperforming' | 'pushing' | 'reassess';

export function deriveStatus(deltaYears: number | null | undefined): MetricStatus {
  if (deltaYears == null) return 'pushing';
  if (deltaYears < 0) return 'outperforming';
  if (deltaYears > 0.5) return 'reassess';
  return 'pushing';
}

export function goodnessPercent(def: MetricDef, value: number | null): number {
  if (value == null) return 0;
  const [lo, hi] = def.range;
  if (hi === lo) return 0;
  const raw = (value - lo) / (hi - lo);
  const pct = def.betterLow ? 1 - raw : raw;
  return Math.min(100, Math.max(0, pct * 100));
}

export function positionPercent(range: [number, number], value: number | null): number {
  if (value == null) return 0;
  const [lo, hi] = range;
  if (hi === lo) return 0;
  return Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
}

export function formatMetricValue(key: MetricKey, value: number | null): string {
  if (value == null) return '—';
  switch (key) {
    case 'daily_steps':
      return Math.round(value).toLocaleString();
    case 'resting_hr':
      return Math.round(value).toString();
    case 'sleep_consistency':
      return value.toFixed(0);
    default:
      return value.toFixed(1);
  }
}

export function describeMetric(def: MetricDef, status: MetricStatus): string {
  return status === 'outperforming' ? def.goodDesc : def.warnDesc;
}
