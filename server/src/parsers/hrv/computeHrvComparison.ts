import { IHrvTick } from './types';

export interface IBlandAltmanResult {
  differences: number[];
  averages: number[];
  meanDifference: number;
  stdDifference: number;
  upperLimit: number;
  lowerLimit: number;
  percentageInLimits: number;
}

export interface IHrvComparisonResult {
  lunaAvg: number;
  benchmarkAvg: number;
  mae: number;
  rmse: number;
  mape: number;
  pearsonR: number;
  meanBias: number;
  coverage: number; // % of Falcon ticks (within the overlap window) that had a matching benchmark tick
  overlapStartSec: number;
  overlapEndSec: number;
  blandAltman: IBlandAltmanResult;
}

const round2 = (v: number) => Math.round(v * 100) / 100;
const round3 = (v: number) => Math.round(v * 1000) / 1000;

// Ported from plot_hrv.js: physiologically implausible readings (chest-strap
// dropout, motion artefact) are excluded before any averaging/comparison —
// a single bad 30s window can otherwise swing the whole-night average.
const PHYSIO_HRV_MAX = 200; // ms — RMSSD above this during sleep is an artefact
const PHYSIO_HR_MIN = 20; // bpm — below this is a sensor dropout
const PHYSIO_HR_MAX = 200; // bpm — above this is an artefact

function isPhysiologicallyValid(field: 'hrv' | 'hr', value: number): boolean {
  if (field === 'hrv') return value <= PHYSIO_HRV_MAX;
  return value >= PHYSIO_HR_MIN && value <= PHYSIO_HR_MAX;
}

function calculatePearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function computeBlandAltman(pairs: Array<{ luna: number; benchmark: number }>): IBlandAltmanResult {
  const MAX_POINTS = 500;
  const step = Math.max(1, Math.ceil(pairs.length / MAX_POINTS));
  const sampledPairs = pairs.filter((_, i) => i % step === 0);

  const differences = sampledPairs.map((p) => p.luna - p.benchmark);
  const averages = sampledPairs.map((p) => (p.luna + p.benchmark) / 2);

  const fullDifferences = pairs.map((p) => p.luna - p.benchmark);
  const meanDifference = fullDifferences.reduce((sum, d) => sum + d, 0) / fullDifferences.length;
  const variance =
    fullDifferences.reduce((sum, d) => sum + Math.pow(d - meanDifference, 2), 0) / fullDifferences.length;
  const stdDifference = Math.sqrt(variance);
  const upperLimit = meanDifference + 1.96 * stdDifference;
  const lowerLimit = meanDifference - 1.96 * stdDifference;
  const inLimits = fullDifferences.filter((d) => d >= lowerLimit && d <= upperLimit).length;

  return {
    differences: differences.map(round2),
    averages: averages.map(round2),
    meanDifference: round2(meanDifference),
    stdDifference: round2(stdDifference),
    upperLimit: round2(upperLimit),
    lowerLimit: round2(lowerLimit),
    percentageInLimits: round2((inLimits / fullDifferences.length) * 100),
  };
}

const GRID_SEC = 30;
const DRIFT_TOLERANCE_TICKS = 1; // absorb up to ±1 grid tick of clock drift between devices

/**
 * Ports the comparison methodology from playground/plot_hrv.js:
 *  1. Restrict both series to their overlapping time window — Falcon usually
 *     runs the whole night while the benchmark (Elite HRV) is a shorter
 *     recording, so anything outside the overlap isn't a fair comparison.
 *  2. Drop physiologically-implausible points (artefacts) before anything
 *     else touches them.
 *  3. Inner-join the two series by timestamp (±1 grid tick to absorb clock
 *     drift between the two independent devices).
 *  4. Compute BOTH devices' averages ONLY over the matched pairs — this is
 *     what plot_hrv.js calls a "paired mean": if Falcon has no reading at a
 *     given moment, that moment's benchmark reading is excluded from the
 *     benchmark average too, and vice versa. This is what guarantees
 *     lunaAvg - benchmarkAvg == meanBias, instead of comparing two averages
 *     computed over different, non-comparable time ranges.
 */
export function computeHrvComparison(
  lunaTicks: IHrvTick[],
  benchmarkTicks: IHrvTick[],
  field: 'hrv' | 'hr'
): IHrvComparisonResult | null {
  const lunaAll = lunaTicks
    .map((t) => ({ unixSec: t.unixSec, value: t[field] }))
    .filter((t): t is { unixSec: number; value: number } => t.value != null);
  const benchmarkAll = benchmarkTicks
    .map((t) => ({ unixSec: t.unixSec, value: t[field] }))
    .filter((t): t is { unixSec: number; value: number } => t.value != null);

  if (lunaAll.length === 0 || benchmarkAll.length === 0) return null;

  // 1. Overlap window — the intersection of the two series' time ranges.
  const overlapStartSec = Math.max(lunaAll[0].unixSec, benchmarkAll[0].unixSec);
  const overlapEndSec = Math.min(lunaAll[lunaAll.length - 1].unixSec, benchmarkAll[benchmarkAll.length - 1].unixSec);
  if (overlapStartSec > overlapEndSec) return null; // no overlap at all

  const inOverlap = (t: { unixSec: number }) => t.unixSec >= overlapStartSec && t.unixSec <= overlapEndSec;

  // 2. Physiological artefact cap — drop implausible readings before pairing.
  const lunaValues = lunaAll.filter(inOverlap).filter((t) => isPhysiologicallyValid(field, t.value));
  const benchmarkValues = benchmarkAll.filter(inOverlap).filter((t) => isPhysiologicallyValid(field, t.value));

  if (lunaValues.length === 0 || benchmarkValues.length === 0) return null;

  // 3. Inner join by timestamp, ±1 grid tick to absorb clock drift.
  const benchmarkMap = new Map<number, number>();
  for (const b of benchmarkValues) benchmarkMap.set(b.unixSec, b.value);

  const pairs: Array<{ luna: number; benchmark: number }> = [];
  const usedBenchmarkTs = new Set<number>();
  for (const l of lunaValues) {
    if (benchmarkMap.has(l.unixSec) && !usedBenchmarkTs.has(l.unixSec)) {
      pairs.push({ luna: l.value, benchmark: benchmarkMap.get(l.unixSec)! });
      usedBenchmarkTs.add(l.unixSec);
      continue;
    }
    let closestTs: number | null = null;
    let minDiff = Infinity;
    for (let off = -DRIFT_TOLERANCE_TICKS; off <= DRIFT_TOLERANCE_TICKS; off++) {
      if (off === 0) continue;
      const candidateTs = l.unixSec + off * GRID_SEC;
      if (benchmarkMap.has(candidateTs) && !usedBenchmarkTs.has(candidateTs)) {
        const diff = Math.abs(off);
        if (diff < minDiff) {
          minDiff = diff;
          closestTs = candidateTs;
        }
      }
    }
    if (closestTs !== null) {
      pairs.push({ luna: l.value, benchmark: benchmarkMap.get(closestTs)! });
      usedBenchmarkTs.add(closestTs);
    }
  }

  if (pairs.length === 0) return null;

  // 4. Paired means — both averages computed over the SAME set of matched
  // moments, so lunaAvg - benchmarkAvg always equals meanBias exactly.
  const n = pairs.length;
  const lunaAvg = pairs.reduce((s, p) => s + p.luna, 0) / n;
  const benchmarkAvg = pairs.reduce((s, p) => s + p.benchmark, 0) / n;

  const mae = pairs.reduce((sum, p) => sum + Math.abs(p.luna - p.benchmark), 0) / n;
  const mse = pairs.reduce((sum, p) => sum + Math.pow(p.luna - p.benchmark, 2), 0) / n;
  const rmse = Math.sqrt(mse);
  const mape =
    pairs.reduce((sum, p) => {
      if (p.benchmark === 0) return sum;
      return sum + (Math.abs(p.luna - p.benchmark) / p.benchmark) * 100;
    }, 0) / n;
  const meanBias = pairs.reduce((sum, p) => sum + (p.luna - p.benchmark), 0) / n;
  const pearsonR = calculatePearsonR(pairs.map((p) => p.luna), pairs.map((p) => p.benchmark));
  const coverage = (n / lunaValues.length) * 100;

  return {
    lunaAvg: round2(lunaAvg),
    benchmarkAvg: round2(benchmarkAvg),
    mae: round2(mae),
    rmse: round2(rmse),
    mape: round2(mape),
    pearsonR: round3(pearsonR),
    meanBias: round2(meanBias),
    coverage: round2(coverage),
    overlapStartSec,
    overlapEndSec,
    blandAltman: computeBlandAltman(pairs),
  };
}
