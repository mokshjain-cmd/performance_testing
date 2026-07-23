import * as fs from 'fs';
import {
  IHrvParseResult,
  IHrvTick,
  IRicherEntry,
  dateKeysInRange,
  keepIfRicher,
  midnightISTFromDateKey,
  nonZeroCount,
} from './types';

/**
 * FalconHrvParser
 *
 * Ports playground/hrv/falcon_parser2.js. Extracts sleep HRV + HR from the
 * Falcon companion-app log (Android or iOS format), on a 30-second grid.
 *
 * Time semantics (matches the reference falcon_parser2.js exactly, which is
 * the trusted ground truth):
 *   - The device's sleepHrvData array for a calendar date D is anchored at
 *     midnight IST of D: index i -> D 00:00 + i*30s.
 *   - We use the single LATEST in-window date's array (the wake date). Its
 *     non-zero slots therefore begin at ~00:00 IST and run to wake time —
 *     which is why Falcon HRV "starts from 00 IST".
 *   - No session-window tick filtering, and no cross-midnight stitching of the
 *     previous evening's array. Anything outside the actual data extent is
 *     handled later by the overlap-window logic in computeHrvComparison, not
 *     here — the parser's only job is to extract and timestamp raw data.
 */
const MIN_ARRAY_LENGTH = 2000; // minimum subStr elements to be a real HRV array

function dateKeyFromLogDateStr(dateStr: string): string {
  const datePart = dateStr.trim().split(' ')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseAndroid(raw: string): {
  bestByDate: Record<string, IRicherEntry>;
  bestHrByDate: Record<string, IRicherEntry>;
} {
  const bestByDate: Record<string, IRicherEntry> = {};
  const bestHrByDate: Record<string, IRicherEntry> = {};

  // sleepHrvData = {"hrv":[<values>],"date":"YYYY-MM-DD 00:00:00"}
  const HRV_RE = /sleepHrvData = \{"hrv":(\[[\d,]+\]),"date":"([^"]+)"\}/g;
  let m: RegExpExecArray | null;
  while ((m = HRV_RE.exec(raw)) !== null) {
    const key = dateKeyFromLogDateStr(m[2]);
    const arr: number[] = JSON.parse(m[1]);
    keepIfRicher(bestByDate, key, arr);
  }

  // ContinuousHeartRateBean{...heartRateData=[...]...}
  // No per-date key in the Android log for HR, so keep one global richest
  // array and reuse it for every HRV date found (same midnight-anchored grid).
  let bestHrGlobal: number[] | null = null;
  let bestHrNz = -1;
  const HR_RE = /ContinuousHeartRateBean\{[^}]*heartRateData=\[([\d, ]+)\]/g;
  let mh: RegExpExecArray | null;
  while ((mh = HR_RE.exec(raw)) !== null) {
    const arr = mh[1].split(',').map((s) => parseInt(s.trim(), 10));
    const nz = nonZeroCount(arr);
    if (nz > bestHrNz) {
      bestHrGlobal = arr;
      bestHrNz = nz;
    }
  }
  if (bestHrGlobal) {
    for (const key of Object.keys(bestByDate)) {
      bestHrByDate[key] = { arr: bestHrGlobal, nz: bestHrNz };
    }
  }

  return { bestByDate, bestHrByDate };
}

function parseIos(raw: string): {
  bestByDate: Record<string, IRicherEntry>;
  bestHrByDate: Record<string, IRicherEntry>;
} {
  const bestByDate: Record<string, IRicherEntry> = {};
  const bestHrByDate: Record<string, IRicherEntry> = {};
  const lines = raw.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<SESleepHRVData>')) {
      let dateStr: string | null = null;
      let dateLineIdx = -1;
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const dm = lines[j].match(/Date:(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2})/);
        if (dm) {
          dateStr = dm[1];
          dateLineIdx = j;
          break;
        }
      }
      if (!dateStr) continue;
      for (let k = dateLineIdx + 1; k <= Math.min(dateLineIdx + 3, lines.length - 1); k++) {
        const sm = lines[k].match(/subStr:([\d,]+)/);
        if (!sm) continue;
        const arr = sm[1].split(',').map(Number);
        if (arr.length < MIN_ARRAY_LENGTH) break;
        keepIfRicher(bestByDate, dateKeyFromLogDateStr(dateStr), arr);
        break;
      }
    }

    if (lines[i].includes('<ContinuousHeartRateData>')) {
      let dateStr: string | null = null;
      let dateLineIdx = -1;
      for (let j = i + 1; j <= Math.min(i + 6, lines.length - 1); j++) {
        const dm = lines[j].match(/Date:(\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2})/);
        if (dm) {
          dateStr = dm[1];
          dateLineIdx = j;
          break;
        }
      }
      if (!dateStr) continue;
      for (let k = dateLineIdx + 1; k <= Math.min(dateLineIdx + 8, lines.length - 1); k++) {
        const sm = lines[k].match(/subStr:([\d,]+)/);
        if (!sm) continue;
        const arr = sm[1].split(',').map(Number);
        if (arr.length >= 2) {
          keepIfRicher(bestHrByDate, dateKeyFromLogDateStr(dateStr), arr);
        }
        break;
      }
    }
  }

  return { bestByDate, bestHrByDate };
}

export function parseFalconHrvLog(
  filePath: string,
  sessionStartTime: Date,
  sessionEndTime: Date,
  mobileType?: string
): IHrvParseResult {
  const raw = fs.readFileSync(filePath, 'utf8');
  const isIos = (mobileType || '').toLowerCase() === 'ios';
  const { bestByDate, bestHrByDate } = isIos ? parseIos(raw) : parseAndroid(raw);

  const datesFound = Object.keys(bestByDate).sort();
  if (datesFound.length === 0) {
    return { ticks: [], metadata: { source: isIos ? 'falcon-ios' : 'falcon-android', datesFound: [] } };
  }

  // Reference behaviour: use the single LATEST calendar date that falls within
  // the session window (the wake date). Its array is midnight-anchored, so its
  // non-zero slots naturally begin at ~00:00 IST — no stitching of the previous
  // evening, no window tick-filtering. (If none of the dates fall in the
  // window — e.g. a mislabeled window — fall back to the latest date present.)
  const inRange = new Set(dateKeysInRange(sessionStartTime, sessionEndTime));
  const candidateDates = datesFound.filter((d) => inRange.has(d));
  const chosenDate = (candidateDates.length ? candidateDates : datesFound).sort().pop()!;

  const hrvEntry = bestByDate[chosenDate];
  const midnight = midnightISTFromDateKey(chosenDate);
  const hrArr = bestHrByDate[chosenDate]?.arr ?? null;

  const ticks: IHrvTick[] = [];
  for (let i = 0; i < hrvEntry.arr.length; i++) {
    if (hrvEntry.arr[i] <= 0) continue;
    const unixSec = midnight + i * 30;
    const hr = hrArr && i < hrArr.length && hrArr[i] > 0 ? hrArr[i] : null;
    ticks.push({ unixSec, hrv: hrvEntry.arr[i], hr });
  }

  ticks.sort((a, b) => a.unixSec - b.unixSec);

  return {
    ticks,
    metadata: {
      source: isIos ? 'falcon-ios' : 'falcon-android',
      datesFound: [chosenDate],
    },
  };
}
