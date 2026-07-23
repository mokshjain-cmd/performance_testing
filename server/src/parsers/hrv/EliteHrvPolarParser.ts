import * as fs from 'fs';
import * as path from 'path';
import { IHrvParseResult, IHrvTick, midnightISTFromDateKey } from './types';

/**
 * EliteHrvPolarParser
 *
 * Ports playground/hrv/polar_parser_k22_base_30.js. Reads a Polar H10 RR
 * export (one RR interval in ms per line, no header) from the Elite HRV app,
 * cleans ectopic beats with the K22 algorithm, and computes RMSSD/HR on a
 * midnight-IST-anchored 30-second grid (contiguous, non-overlapping ±15s
 * windows) — the same grid FalconHrvParser produces, so the two can be
 * joined directly by timestamp.
 */
const IBI_MIN = 300; // ms
const IBI_MAX = 2000; // ms
const K22_THRESH = 0.22;
const HALF_WIN_SEC = 15;
const MIN_BEATS_WINDOW = 4;
const FREQ_SEC = 30;

// Accepts both "YYYY-MM-DD_HH-MM-SS" and "YYYY-MM-DD HH-MM-SS" (real exports
// have been seen with either separator between the date and time portions).
const FILENAME_RE = /(\d{4}-\d{2}-\d{2})[_ ](\d{2})-(\d{2})-(\d{2})$/;

interface IK22CleanResult {
  cleaned: number[];
  nRange: number;
  nK22: number;
}

function interpolateBad(arr: number[], bad: boolean[]): number[] {
  const n = arr.length;
  const out = [...arr];
  for (let i = 0; i < n; i++) {
    if (!bad[i]) continue;
    let prev = i - 1;
    while (prev >= 0 && bad[prev]) prev--;
    let next = i + 1;
    while (next < n && bad[next]) next++;
    if (prev < 0 && next >= n) {
      // whole array bad — leave as-is
    } else if (prev < 0) {
      out[i] = out[next];
    } else if (next >= n) {
      out[i] = out[prev];
    } else {
      out[i] = Math.round(out[prev] + ((arr[next] - out[prev]) * (i - prev)) / (next - prev));
    }
  }
  return out;
}

/** Three-pass ectopic-beat clean: range-clip then 22%-neighbor-deviation clip. */
function k22Clean(beats: number[]): IK22CleanResult {
  const n = beats.length;

  let rr = [...beats];
  const rangeBad = rr.map((v) => v < IBI_MIN || v > IBI_MAX);
  if (rangeBad.some(Boolean)) rr = interpolateBad(rr, rangeBad);

  const k22Bad = new Array(n).fill(false);
  for (let i = 1; i < n - 1; i++) {
    const ref = (rr[i - 1] + rr[i + 1]) / 2;
    if (ref !== 0 && Math.abs(rr[i] - ref) / ref > K22_THRESH) k22Bad[i] = true;
  }
  if (k22Bad.some(Boolean)) rr = interpolateBad(rr, k22Bad);

  return {
    cleaned: rr,
    nRange: rangeBad.filter(Boolean).length,
    nK22: k22Bad.filter(Boolean).length,
  };
}

/** Standard RMSSD = sqrt( sum((rr_i - rr_{i-1})^2) / (N-1) ). */
function rmssd(arr: number[]): number | null {
  if (arr.length < 2) return null;
  let sumSq = 0;
  for (let i = 1; i < arr.length; i++) {
    const d = arr[i] - arr[i - 1];
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (arr.length - 1));
}

/**
 * @param filePath path to read the RRI content from (multer renames files on
 * disk, e.g. "luna_HRV_<userId>_<start>_<end>.txt", so this is NOT where the
 * recording timestamp comes from).
 * @param originalFilename the uploader's original filename, e.g.
 * "2026-07-22_23-51-00.txt" — this is what actually encodes the recording
 * start time. Defaults to filePath for direct/script invocations where the
 * on-disk name IS the original (e.g. the playground sample files).
 */
export function parseEliteHrvRri(filePath: string, originalFilename?: string): IHrvParseResult {
  const nameForTimestamp = originalFilename || filePath;
  const base = path.basename(nameForTimestamp, path.extname(nameForTimestamp));
  const fnm = base.match(FILENAME_RE);
  if (!fnm) {
    throw new Error(`Elite HRV filename must be YYYY-MM-DD_HH-MM-SS (or with a space separator): ${base}`);
  }
  const [, datePart, hh, mm, ss] = fnm;
  const startSec = parseInt(hh, 10) * 3600 + parseInt(mm, 10) * 60 + parseInt(ss, 10);
  const midnightUs = midnightISTFromDateKey(datePart);

  const rawBeats = fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((l) => parseInt(l.trim(), 10))
    .filter((v) => !isNaN(v) && v > 50 && v < 10000);

  if (rawBeats.length === 0) {
    return { ticks: [], metadata: { source: 'elitehrv', datesFound: [datePart] } };
  }

  const { cleaned } = k22Clean(rawBeats);

  // Absolute timeline uses the RAW RR to advance elapsed time (so ectopic
  // correction doesn't distort timing); the cleaned RR value is what's stored.
  let cumMs = startSec * 1000;
  const beatAbs = cleaned.map((rr, i) => {
    cumMs += rawBeats[i];
    return { absMs: cumMs, rr };
  });
  const recEndMs = startSec * 1000 + (cumMs - startSec * 1000);

  const firstTickS = Math.ceil(startSec / FREQ_SEC) * FREQ_SEC;
  const lastTickS = Math.floor(recEndMs / 1000 / FREQ_SEC) * FREQ_SEC;

  const ticks: IHrvTick[] = [];
  let dropped = 0;
  for (let tickS = firstTickS; tickS <= lastTickS; tickS += FREQ_SEC) {
    const winStartMs = (tickS - HALF_WIN_SEC) * 1000;
    const winEndMs = (tickS + HALF_WIN_SEC) * 1000;
    const window = beatAbs.filter((b) => b.absMs >= winStartMs && b.absMs < winEndMs);
    if (window.length < MIN_BEATS_WINDOW) {
      dropped++;
      continue;
    }

    const ibiVals = window.map((b) => b.rr);
    const val = rmssd(ibiVals);
    if (val === null) {
      dropped++;
      continue;
    }

    const meanRR = ibiVals.reduce((a, b) => a + b, 0) / ibiVals.length;
    ticks.push({
      unixSec: midnightUs + tickS,
      hrv: Math.round(val),
      hr: Math.round(60000 / meanRR),
    });
  }

  return {
    ticks,
    metadata: { source: 'elitehrv', datesFound: [datePart], droppedTicks: dropped },
  };
}
