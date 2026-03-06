/**
 * Normalize timestamp to 30-second boundaries
 * This ensures epoch alignment between different devices
 * 
 * Examples:
 * - 00:19:41 → 00:19:30
 * - 00:20:11 → 00:20:00
 * - 00:20:29 → 00:20:00
 * - 00:20:30 → 00:20:30
 * - 00:20:59 → 00:20:30
 */

/**
 * Normalizes a Unix timestamp (in seconds) to the nearest 30-second boundary (floor)
 * @param timestampSec Unix timestamp in seconds
 * @returns Normalized Unix timestamp in seconds
 */
export function normalizeTimestampSec(timestampSec: number): number {
  // Round down to nearest 30-second boundary
  return Math.floor(timestampSec / 30) * 30;
}

/**
 * Normalizes a Unix timestamp (in milliseconds) to the nearest 30-second boundary (floor)
 * @param timestampMs Unix timestamp in milliseconds
 * @returns Normalized Unix timestamp in milliseconds
 */
export function normalizeTimestampMs(timestampMs: number): number {
  // Convert to seconds, normalize, convert back to milliseconds
  const timestampSec = Math.floor(timestampMs / 1000);
  const normalizedSec = normalizeTimestampSec(timestampSec);
  return normalizedSec * 1000;
}

/**
 * Normalizes a Date object to the nearest 30-second boundary (floor)
 * @param date Date object to normalize
 * @returns New Date object with normalized timestamp
 */
export function normalizeDate(date: Date): Date {
  const timestampMs = date.getTime();
  const normalizedMs = normalizeTimestampMs(timestampMs);
  return new Date(normalizedMs);
}
