import apiClient from './api';
import type { WorkoutSessionDetails, WorkoutOverviewData, WorkoutReadingsResult } from '../types';

/**
 * Workout Service - API calls for workout metric
 */

// Get user's workout overview/summary
export const getWorkoutOverview = async (): Promise<WorkoutOverviewData> => {
  const response = await apiClient.get('/workout/overview');
  return response.data.data;
};

// Get user's workout trend data
export const getWorkoutTrend = async (days: number = 30) => {
  const response = await apiClient.get(`/workout/trend?days=${days}`);
  return response.data.data;
};

// Get single workout session details
export const getWorkoutSession = async (sessionId: string): Promise<WorkoutSessionDetails> => {
  console.log('[workout.service] getWorkoutSession called with:', sessionId);
  const response = await apiClient.get(`/workout/session/${sessionId}`);
  console.log('[workout.service] getWorkoutSession raw response:', response.data);
  return response.data.data;
};

// Get workout readings (per-second HR data) - returns both luna AND benchmark
export const getWorkoutReadings = async (sessionId: string): Promise<WorkoutReadingsResult> => {
  console.log('[workout.service] getWorkoutReadings called with:', sessionId);
  const response = await apiClient.get(`/workout/session/${sessionId}/readings`);
  console.log('[workout.service] getWorkoutReadings raw response:', response.data);
  
  // Backend returns { luna: [], benchmark: [], benchmarkDeviceType, totalCount, lunaCount, benchmarkCount }
  const data = response.data.data;
  console.log('[workout.service] readings data structure:', data);
  
  // Return both luna and benchmark readings
  return {
    luna: data?.luna || [],
    benchmark: data?.benchmark || null,
    benchmarkDeviceType: data?.benchmarkDeviceType,
  };
};

// Admin: Get global workout summary
export const getAdminWorkoutGlobalSummary = async () => {
  const response = await apiClient.get('/workout/admin/global');
  return response.data.data;
};

// Admin: Get firmware performance for workouts
export const getAdminWorkoutFirmwarePerformance = async () => {
  const response = await apiClient.get('/workout/admin/firmware');
  return response.data.data;
};

// Admin: Get benchmark comparison for workouts
export const getAdminWorkoutBenchmarkComparison = async () => {
  const response = await apiClient.get('/workout/admin/benchmark');
  return response.data.data;
};

// Admin: Get user's workout summary
export const getAdminUserWorkoutSummary = async (userId: string) => {
  const response = await apiClient.get(`/workout/admin/user/${userId}`);
  return response.data.data;
};

// Admin: Get all workout sessions
export const getAdminAllWorkoutSessions = async (filters?: {
  userId?: string;
  sportType?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.userId) params.append('userId', filters.userId);
  if (filters?.sportType) params.append('sportType', filters.sportType.toString());
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  
  const response = await apiClient.get(`/workout/admin/sessions?${params.toString()}`);
  return response.data.data;
};

export default {
  getWorkoutOverview,
  getWorkoutTrend,
  getWorkoutSession,
  getWorkoutReadings,
  getAdminWorkoutGlobalSummary,
  getAdminWorkoutFirmwarePerformance,
  getAdminWorkoutBenchmarkComparison,
  getAdminUserWorkoutSummary,
  getAdminAllWorkoutSessions,
};
