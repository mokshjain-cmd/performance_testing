// Environment-based API URL configuration
const ENV = import.meta.env.VITE_ENV || 'development';

const API_URLS: Record<string, string> = {
  development: 'http://localhost:3000/api',
  uat: 'https://performance-testing-backend-uat-326803110924.asia-south2.run.app/api',  // UAT backend URL
  production: 'https://performance-testing-326803110924.asia-south2.run.app/api',
};

export const API_BASE_URL = API_URLS[ENV] || API_URLS.development;

// App configuration
export const APP_NAME = 'Performance Testing Platform';
export const APP_VERSION = '1.0.0';
export const CURRENT_ENV = ENV;
