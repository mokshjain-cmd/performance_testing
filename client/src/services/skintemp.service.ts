import apiClient from './api';
import type { ApiResponse } from '../types';
import type {
  UserSkinTempOverview,
  SkinTempSessionView,
  SkinTempTrendData,
  AdminSkinTempGlobalSummary,
  AdminSkinTempFirmwareComparison,
  AdminSkinTempBenchmarkComparison,
} from '../types/skintemp.types';

export const skintempService = {
  // ========================
  // USER APIs
  // ========================

  /**
   * Get user SkinTemp overview (across all sessions)
   * Note: userId is extracted from JWT token by backend
   */
  getUserSkinTempOverview: async (): Promise<UserSkinTempOverview> => {
    console.log('[SkinTemp Service] 🔵 API Call: GET /skintemp/overview');
    const response = await apiClient.get<ApiResponse<UserSkinTempOverview>>(
      '/skintemp/overview'
    );
    console.log('[SkinTemp Service] ✅ Response:', response.data);
    return response.data.data!;
  },

  /**
   * Get user SkinTemp trend data
   * Note: userId is extracted from JWT token by backend
   */
  getUserSkinTempTrend: async (): Promise<SkinTempTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SkinTempTrendData[]>>(
      '/skintemp/trend'
    );
    return response.data.data || [];
  },

  /**
   * Get single SkinTemp session view
   */
  getSingleSessionView: async (
    sessionId: string,
    includeReadings: boolean = true
  ): Promise<SkinTempSessionView> => {
    console.log(`[SkinTemp Service] 🔵 API Call: GET /skintemp/session/${sessionId}`);
    const response = await apiClient.get<ApiResponse<SkinTempSessionView>>(
      `/skintemp/session/${sessionId}`,
      { params: { includeReadings } }
    );
    console.log('[SkinTemp Service] ✅ Response:', response.data);
    return response.data.data!;
  },

  // ========================
  // ADMIN APIs
  // ========================

  /**
   * Get admin global SkinTemp summary
   */
  getAdminGlobalSummary: async (latestFirmwareOnly: boolean = false): Promise<AdminSkinTempGlobalSummary> => {
    const response = await apiClient.get<ApiResponse<AdminSkinTempGlobalSummary>>(
      '/skintemp/admin/global',
      { params: { latestFirmwareOnly } }
    );
    return response.data.data!;
  },

  /**
   * Get firmware comparison for SkinTemp
   */
  getAdminFirmwareComparison: async (): Promise<AdminSkinTempFirmwareComparison[]> => {
    const response = await apiClient.get<ApiResponse<AdminSkinTempFirmwareComparison[]>>(
      '/skintemp/admin/firmware'
    );
    return response.data.data || [];
  },

  /**
   * Get benchmark comparison for SkinTemp
   */
  getAdminBenchmarkComparison: async (): Promise<AdminSkinTempBenchmarkComparison[]> => {
    const response = await apiClient.get<ApiResponse<AdminSkinTempBenchmarkComparison[]>>(
      '/skintemp/admin/benchmark'
    );
    return response.data.data || [];
  },

  /**
   * Get SkinTemp accuracy trend over time
   */
  getAdminAccuracyTrend: async (startDate?: string, endDate?: string): Promise<SkinTempTrendData[]> => {
    const response = await apiClient.get<ApiResponse<SkinTempTrendData[]>>(
      '/skintemp/admin/trend',
      { params: { startDate, endDate } }
    );
    return response.data.data || [];
  },

  /**
   * Get admin view of specific user's SkinTemp summary
   */
  getAdminUserSummary: async (userId: string): Promise<UserSkinTempOverview> => {
    const response = await apiClient.get<ApiResponse<UserSkinTempOverview>>(
      `/admin/skintemp/users/${userId}`
    );
    return response.data.data!;
  },

  /**
   * Get admin view of specific SkinTemp session
   */
  getAdminSessionSummary: async (sessionId: string): Promise<SkinTempSessionView & { userId: string }> => {
    const response = await apiClient.get<ApiResponse<SkinTempSessionView & { userId: string }>>(
      `/admin/skintemp/session/${sessionId}`
    );
    return response.data.data!;
  },
};
