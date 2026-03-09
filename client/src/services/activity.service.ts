import apiClient from './api';
import type { ApiResponse } from '../types';
import type {
  UserActivityOverview,
  UserSingleActivitySessionView,
  AdminGlobalActivitySummary,
  FirmwareActivityPerformance,
  BenchmarkActivityComparison,
  AdminActivitySessionSummary,
  AdminUserActivitySummary,
  ActivityTrendData,
  ActivityAccuracyTrend,
  GetUserActivitySessionViewParams,
  GetAdminGlobalActivitySummaryParams,
  GetAdminActivityUserSummaryParams,
  GetAdminActivitySessionSummaryParams,
} from '../types/activity.types';

export const activityService = {
  // ========================
  // USER APIs
  // ========================

  /**
   * Get user activity overview (across all sessions)
   * Note: userId is extracted from JWT token by backend
   */
  getUserActivityOverview: async (): Promise<UserActivityOverview> => {
    const response = await apiClient.get<ApiResponse<UserActivityOverview>>(
      '/activity/overview'
    );
    return response.data.data!;
  },

  /**
   * Get user activity trend data
   * Note: userId is extracted from JWT token by backend
   */
  getUserActivityTrend: async (): Promise<ActivityTrendData[]> => {
    const response = await apiClient.get<ApiResponse<ActivityTrendData[]>>(
      '/activity/trend'
    );
    return response.data.data || [];
  },

  /**
   * Get single activity session view (user perspective)
   */
  getUserSessionView: async (
    params: GetUserActivitySessionViewParams
  ): Promise<UserSingleActivitySessionView> => {
    const response = await apiClient.get<ApiResponse<UserSingleActivitySessionView>>(
      `/activity/session/${params.sessionId}`,
      { params: { includeDailyData: params.includeDailyData ?? true } }
    );
    return response.data.data!;
  },

  // ========================
  // ADMIN APIs
  // ========================

  /**
   * Get admin global activity summary
   */
  getAdminGlobalSummary: async (
    params?: GetAdminGlobalActivitySummaryParams
  ): Promise<AdminGlobalActivitySummary> => {
    const response = await apiClient.get<ApiResponse<AdminGlobalActivitySummary>>(
      '/activity/admin/global-summary',
      { params }
    );
    return response.data.data!;
  },

  /**
   * Get admin accuracy trend (accuracy, MAE over time)
   */
  getAdminAccuracyTrend: async (
    startDate?: string,
    endDate?: string
  ): Promise<ActivityAccuracyTrend[]> => {
    const response = await apiClient.get<ApiResponse<ActivityAccuracyTrend[]>>(
      '/activity/admin/accuracy-trend',
      { params: { startDate, endDate } }
    );
    return response.data.data || [];
  },

  /**
   * Get firmware-wise performance comparison
   */
  getFirmwareComparison: async (): Promise<FirmwareActivityPerformance[]> => {
    const response = await apiClient.get<ApiResponse<FirmwareActivityPerformance[]>>(
      '/activity/admin/firmware-comparison'
    );
    return response.data.data || [];
  },

  /**
   * Get benchmark-wise performance comparison
   */
  getBenchmarkComparison: async (): Promise<BenchmarkActivityComparison[]> => {
    const response = await apiClient.get<ApiResponse<BenchmarkActivityComparison[]>>(
      '/activity/admin/benchmark-comparison'
    );
    return response.data.data || [];
  },

  /**
   * Get admin user summary
   */
  getAdminUserSummary: async (
    params: GetAdminActivityUserSummaryParams
  ): Promise<AdminUserActivitySummary> => {
    const response = await apiClient.get<ApiResponse<AdminUserActivitySummary>>(
      `/activity/admin/user/${params.userId}`
    );
    return response.data.data!;
  },

  /**
   * Get admin session summary
   */
  getAdminSessionSummary: async (
    params: GetAdminActivitySessionSummaryParams
  ): Promise<AdminActivitySessionSummary> => {
    const response = await apiClient.get<ApiResponse<AdminActivitySessionSummary>>(
      `/activity/admin/session/${params.sessionId}`
    );
    return response.data.data!;
  },

  /**
   * Get user firmware comparison
   */
  getUserFirmwareComparison: async (
    userId: string
  ): Promise<FirmwareActivityPerformance[]> => {
    const response = await apiClient.get<ApiResponse<FirmwareActivityPerformance[]>>(
      `/activity/admin/user/${userId}/firmware-comparison`
    );
    return response.data.data || [];
  },

  /**
   * Get user benchmark comparison
   */
  getUserBenchmarkComparison: async (
    userId: string
  ): Promise<BenchmarkActivityComparison[]> => {
    const response = await apiClient.get<ApiResponse<BenchmarkActivityComparison[]>>(
      `/activity/admin/user/${userId}/benchmark-comparison`
    );
    return response.data.data || [];
  },
};
