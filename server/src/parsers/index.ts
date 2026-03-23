/**
 * Parsers for the application
 * Add your data parsing/transformation functions here
 */

export const parseQueryString = (query: string): Record<string, string> => {
  const params = new URLSearchParams(query);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
};

export const parseJSON = <T>(data: string): T | null => {
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
};

// Export device-specific parsers
export { parseLunaCsv } from './lunaParser';
export { parsePolarCsv } from './polarParser';
export { parseMasimoSpo2Csv } from './masimoSpo2Parser';
export { parseLunaSpo2Csv } from './lunaSpo2Parser';
export { LunaIOSHRParser } from './lunaiosHRParser';
export { LunaIOSSPO2Parser, parseLunaIosSpo2Csv } from './lunaiosspo2parser';
export { parseAppleHR } from './appleHRparser';

// Export sleep parsers
export { LunaSleepParser } from './sleep/LunaSleepParser';
export { LunaSleepParserIOS } from './sleep/LunaSleepParserIOS';
export { AppleSleepParser } from './sleep/AppleSleepParser';
export { AppleHealthSleepParser } from './sleep/AppleHealthSleepParser';

// Export activity parsers
export { LunaActivityParser } from './activity/LunaActivityParser';
export { AppleHealthActivityParser } from './activity/AppleHealthActivityParser';
