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
  GetUserSleepOverviewParams,
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
   */
  getUserSleepOverview: async (
    params: GetUserSleepOverviewParams
  ): Promise<UserSleepOverview> => {
    const response = await apiClient.get<ApiResponse<UserSleepOverview>>(
      '/sleep/user/overview',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get user sleep trend data
   */
  getUserSleepTrend: async (
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SleepTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SleepTrendData[]>>(
      '/sleep/user/trend',
      { params: { userId, startDate, endDate } }
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
      `/sleep/user/session/${params.sessionId}`,
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
   * Get admin global trend (accuracy, kappa over time)
   */
  getAdminGlobalTrend: async (
    startDate?: string,
    endDate?: string
  ): Promise<SleepTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SleepTrendData[]>>(
      '/sleep/admin/global-trend',
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
      `/sleep/admin/user/${params.userId}/summary`,
      { params: { startDate: params.startDate, endDate: params.endDate } }
    );
    return response.data.data!;
  },

  /**
   * Get admin user trend
   */
  getAdminUserTrend: async (
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SleepTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SleepTrendData[]>>(
      `/sleep/admin/user/${userId}/trend`,
      { params: { startDate, endDate } }
    );
    return response.data.data || [];
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

  // ========================
  // UTILITY APIs
  // ========================

  /**
   * Get available firmware versions for sleep
   */
  getAvailableFirmwareVersions: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(
      '/sleep/firmware-versions'
    );
    return response.data.data || [];
  },

  /**
   * Get available benchmark devices
   */
  getAvailableBenchmarkDevices: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(
      '/sleep/benchmark-devices'
    );
    return response.data.data || [];
  },
};
