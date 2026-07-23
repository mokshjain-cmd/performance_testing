/**
 * Shared types for the HRV parsers (Falcon device log + Elite HRV/Polar RRI export).
 * Both parsers emit the same tick shape on a midnight-IST-anchored 30-second grid,
 * so they can be joined directly by timestamp for comparison.
 */
export interface IHrvTick {
  unixSec: number; // midnight-IST-anchored, 30s-grid-aligned
  hrv: number | null;
  hr: number | null;
}

export interface IHrvParseResult {
  ticks: IHrvTick[];
  metadata: {
    source: string;
    datesFound: string[];
    droppedTicks?: number;
  };
}

export const IST_OFFSET_SEC = (5 * 60 + 30) * 60;

/** Unix seconds -> "YYYY-MM-DD HH:MM:SS" in IST (UTC+5:30). */
export function toISTFull(unixSec: number): string {
  return new Date((unixSec + IST_OFFSET_SEC) * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

/** "YYYY-MM-DD" (IST calendar date) -> midnight IST in unix seconds. */
export function midnightISTFromDateKey(dateKey: string): number {
  return Math.floor(new Date(dateKey + 'T00:00:00+05:30').getTime() / 1000);
}

/** A Date -> its IST calendar-date key "YYYY-MM-DD". */
export function dateKeyFromDate(d: Date): string {
  const ist = new Date(d.getTime() + IST_OFFSET_SEC * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** All IST calendar-date keys a [start, end] window touches (inclusive), in order. */
export function dateKeysInRange(start: Date, end: Date): string[] {
  const keys: string[] = [];
  let cursor = midnightISTFromDateKey(dateKeyFromDate(start));
  const endKey = midnightISTFromDateKey(dateKeyFromDate(end));
  while (cursor <= endKey) {
    keys.push(dateKeyFromDate(new Date(cursor * 1000)));
    cursor += 24 * 60 * 60;
  }
  return keys;
}

/** Count how many elements are > 0. Used to pick the richest copy of an array. */
export function nonZeroCount(arr: number[]): number {
  let n = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > 0) n++;
  return n;
}

export interface IRicherEntry {
  arr: number[];
  nz: number;
}

/**
 * Keep arr under key only if it has more non-zero slots than whatever is
 * already stored — a later sync can zero-flush the device cache, silently
 * destroying valid data if we always took the most recent copy instead.
 */
export function keepIfRicher(store: Record<string, IRicherEntry>, key: string, arr: number[]): void {
  const nz = nonZeroCount(arr);
  if (!store[key] || nz > store[key].nz) {
    store[key] = { arr, nz };
  }
}
