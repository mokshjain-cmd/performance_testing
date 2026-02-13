/**
 * Utility functions for the application
 * Add your utility/helper functions here
 */

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};
