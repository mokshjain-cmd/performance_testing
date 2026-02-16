// utils/dateTime.ts

/**
 * Splits an ISO string (e.g. 2026-02-16T12:16:30.000Z) into date and time parts.
 * Returns { date: 'YYYY-MM-DD', time: 'HH:mm:ss' }
 */
export function splitDateTime(iso: string): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const [date, timeWithZone] = iso.split('T');
  const time = timeWithZone ? timeWithZone.replace('Z', '').split('.')[0] : '';
  return { date, time };
}
