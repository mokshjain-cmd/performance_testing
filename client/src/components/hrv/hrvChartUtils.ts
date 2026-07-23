import type { HrvReadingPoint } from './HrvChart';

/**
 * Ported from playground/plot_hrv.js: a physiologically implausible reading
 * (chest-strap dropout, motion artefact) is excluded before anything else
 * touches it — shown as a gap, never averaged in.
 */
export const PHYSIO_HRV_MAX = 200; // ms
export const PHYSIO_HR_MIN = 20; // bpm
export const PHYSIO_HR_MAX = 200; // bpm

export function capValue(field: 'hrv' | 'hr', value: number | null | undefined): number | null {
  if (value == null) return null;
  if (field === 'hrv') return value <= PHYSIO_HRV_MAX ? value : null;
  return value >= PHYSIO_HR_MIN && value <= PHYSIO_HR_MAX ? value : null;
}

/**
 * The intersection of the two series' time ranges (first valid reading to
 * last valid reading on each side). Falcon usually runs the whole night
 * while the benchmark is a shorter spot-check recording, so anything outside
 * this window isn't a fair side-by-side comparison and shouldn't be plotted.
 */
export function computeOverlapWindowMs(
  lunaReadings: HrvReadingPoint[],
  benchmarkReadings: HrvReadingPoint[] | null | undefined,
  field: 'hrv' | 'hr'
): { startMs: number; endMs: number } | null {
  if (!benchmarkReadings || benchmarkReadings.length === 0) return null;

  const validTimes = (readings: HrvReadingPoint[]) =>
    readings.filter((r) => capValue(field, r[field]) != null).map((r) => new Date(r.timestamp).getTime());

  const lunaTimes = validTimes(lunaReadings);
  const benchmarkTimes = validTimes(benchmarkReadings);
  if (lunaTimes.length === 0 || benchmarkTimes.length === 0) return null;

  const startMs = Math.max(Math.min(...lunaTimes), Math.min(...benchmarkTimes));
  const endMs = Math.min(Math.max(...lunaTimes), Math.max(...benchmarkTimes));
  if (startMs > endMs) return null;

  return { startMs, endMs };
}

export function restrictToWindow(
  readings: HrvReadingPoint[],
  window: { startMs: number; endMs: number } | null
): HrvReadingPoint[] {
  if (!window) return readings;
  return readings.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return t >= window.startMs && t <= window.endMs;
  });
}
