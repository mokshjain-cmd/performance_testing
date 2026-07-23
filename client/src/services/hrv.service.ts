import apiClient from './api';

/**
 * HRV Service - API calls for the HRV metric
 */

export const getHrvOverview = async () => {
  const response = await apiClient.get('/hrv/overview');
  return response.data.data;
};

export const getHrvTrend = async (days: number = 30) => {
  const response = await apiClient.get(`/hrv/trend?days=${days}`);
  return response.data.data;
};

export const getHrvSession = async (sessionId: string) => {
  const response = await apiClient.get(`/hrv/session/${sessionId}`);
  return response.data.data;
};

export const getHrvReadings = async (sessionId: string) => {
  const response = await apiClient.get(`/hrv/session/${sessionId}/readings`);
  return response.data.data;
};

export const getAdminHrvGlobalSummary = async () => {
  const response = await apiClient.get('/hrv/admin/global');
  return response.data.data;
};

export const getAdminHrvDailyTrend = async (days: number = 30) => {
  const response = await apiClient.get(`/hrv/admin/daily-trend?days=${days}`);
  return response.data.data;
};

export const getAdminHrvFirmwarePerformance = async () => {
  const response = await apiClient.get('/hrv/admin/firmware');
  return response.data.data;
};

export const getAdminHrvBenchmarkComparison = async () => {
  const response = await apiClient.get('/hrv/admin/benchmark');
  return response.data.data;
};

export const getAdminUserHrvSummary = async (userId: string) => {
  const response = await apiClient.get(`/hrv/admin/user/${userId}`);
  return response.data.data;
};

export const getAdminUserHrvTrend = async (userId: string, days: number = 30) => {
  const response = await apiClient.get(`/hrv/admin/user/${userId}/trend?days=${days}`);
  return response.data.data;
};

export const getAdminAllHrvSessions = async (limit = 50, skip = 0) => {
  const response = await apiClient.get(`/hrv/admin/sessions?limit=${limit}&skip=${skip}`);
  return response.data.data;
};

export default {
  getHrvOverview,
  getHrvTrend,
  getHrvSession,
  getHrvReadings,
  getAdminHrvGlobalSummary,
  getAdminHrvDailyTrend,
  getAdminHrvFirmwarePerformance,
  getAdminHrvBenchmarkComparison,
  getAdminUserHrvSummary,
  getAdminUserHrvTrend,
  getAdminAllHrvSessions,
};
