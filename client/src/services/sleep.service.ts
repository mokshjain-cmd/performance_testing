import apiClient from './api';
import type { ApiResponse } from '../types';
import type {
  UserSleepOverview,
  UserSingleSessionView,
  AdminGlobalSleepSummary,
  FirmwarePerformance,
  BenchmarkComparison,
  AdminSessionSummary,
  SleepTrendData,
  GetUserSessionViewParams,
  GetAdminGlobalSummaryParams,
  GetFirmwareComparisonParams,
  GetBenchmarkComparisonParams,
  GetAdminUserSummaryParams,
  GetAdminSessionSummaryParams,
} from '../types/sleep.types';

export const sleepService = {
  // ========================
  // USER APIs
  // ========================

  /**
   * Get user sleep overview (across all sessions)
   * Note: userId is extracted from JWT token by backend
   */
  getUserSleepOverview: async (): Promise<UserSleepOverview> => {
    const response = await apiClient.get<ApiResponse<UserSleepOverview>>(
      '/sleep/overview'
    );
    return response.data.data!;
  },

  /**
   * Get user sleep trend data
   * Note: userId is extracted from JWT token by backend
   */
  getUserSleepTrend: async (
    startDate?: string,
    endDate?: string
  ): Promise<SleepTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SleepTrendData[]>>(
      '/sleep/trend',
      { params: { startDate, endDate } }
    );
    return response.data.data || [];
  },

  /**
   * Get single sleep session view (user perspective)
   */
  getUserSessionView: async (
    params: GetUserSessionViewParams
  ): Promise<UserSingleSessionView> => {
    const response = await apiClient.get<ApiResponse<UserSingleSessionView>>(
      `/sleep/session/${params.sessionId}`,
      { params: { includeEpochs: params.includeEpochs ?? true } }
    );
    return response.data.data!;
  },

  // ========================
  // ADMIN APIs
  // ========================

  /**
   * Get admin global sleep summary
   */
  getAdminGlobalSummary: async (
    params?: GetAdminGlobalSummaryParams
  ): Promise<AdminGlobalSleepSummary> => {
    const response = await apiClient.get<ApiResponse<AdminGlobalSleepSummary>>(
      '/sleep/admin/global-summary',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get admin accuracy trend (accuracy, kappa over time)
   */
  getAdminAccuracyTrend: async (
    startDate?: string,
    endDate?: string
  ): Promise<SleepTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SleepTrendData[]>>(
      '/sleep/admin/accuracy-trend',
      { params: { startDate, endDate } }
    );
    return response.data.data || [];
  },

  /**
   * Get firmware-wise performance comparison
   */
  getFirmwareComparison: async (
    params?: GetFirmwareComparisonParams
  ): Promise<FirmwarePerformance[]> => {
    const response = await apiClient.get<ApiResponse<FirmwarePerformance[]>>(
      '/sleep/admin/firmware-comparison',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get benchmark device comparison
   */
  getBenchmarkComparison: async (
    params?: GetBenchmarkComparisonParams
  ): Promise<BenchmarkComparison[]> => {
    const response = await apiClient.get<ApiResponse<BenchmarkComparison[]>>(
      '/sleep/admin/benchmark-comparison',
      { params }
    );
    return response.data.data || [];
  },

  /**
   * Get admin user summary (single user, all sessions)
   */
  getAdminUserSummary: async (
    params: GetAdminUserSummaryParams
  ): Promise<UserSleepOverview> => {
    const response = await apiClient.get<ApiResponse<UserSleepOverview>>(
      `/sleep/admin/user/${params.userId}`,
      { params: { startDate: params.startDate, endDate: params.endDate } }
    );
    return response.data.data!;
  },

  /**
   * Get admin session summary (detailed single session view)
   */
  getAdminSessionSummary: async (
    params: GetAdminSessionSummaryParams
  ): Promise<AdminSessionSummary> => {
    const response = await apiClient.get<ApiResponse<AdminSessionSummary>>(
      `/sleep/admin/session/${params.sessionId}`,
      { params: { includeEpochs: params.includeEpochs ?? true } }
    );
    return response.data.data!;
  },
};
