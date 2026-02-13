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
