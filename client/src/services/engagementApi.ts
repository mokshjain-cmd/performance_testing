import type { EngagementUser, UserOverview, DailyMetrics, EngagementStats } from '../types/engagement';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class EngagementApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  /**
   * Get all users with engagement summary
   */
  async getAllUsers(): Promise<EngagementUser[]> {
    const response = await fetch(`${API_BASE_URL}/engagement/users`, {
      headers: this.getHeaders()
    });
    
    const data: ApiResponse<EngagementUser[]> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch users');
    }
    
    return data.data || [];
  }

  /**
   * Get specific user engagement summary with metrics
   */
  async getUserOverview(userId: string, days: number = 30): Promise<UserOverview> {
    const response = await fetch(
      `${API_BASE_URL}/engagement/users/${userId}?days=${days}`,
      {
        headers: this.getHeaders()
      }
    );
    
    const data: ApiResponse<UserOverview> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch user overview');
    }
    
    return data.data!;
  }

  /**
   * Get metrics for specific date range
   */
  async getUserMetrics(
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      metricType?: 'hr' | 'sleep' | 'activity' | 'spo2';
    }
  ): Promise<DailyMetrics[]> {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.metricType) params.append('metricType', options.metricType);
    
    const url = `${API_BASE_URL}/engagement/users/${userId}/metrics?${params.toString()}`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    
    const data: ApiResponse<DailyMetrics[]> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch user metrics');
    }
    
    return data.data || [];
  }

  /**
   * Get inactive users (for device reclaim)
   */
  async getInactiveUsers(daysThreshold: number = 14): Promise<EngagementUser[]> {
    const response = await fetch(
      `${API_BASE_URL}/engagement/inactive-users?days=${daysThreshold}`,
      {
        headers: this.getHeaders()
      }
    );
    
    const data: ApiResponse<{ count: number; data: EngagementUser[] }> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch inactive users');
    }
    
    return data.data?.data || [];
  }

  /**
   * Get engagement statistics
   */
  async getStats(): Promise<EngagementStats> {
    const response = await fetch(`${API_BASE_URL}/engagement/stats`, {
      headers: this.getHeaders()
    });
    
    const data: ApiResponse<EngagementStats> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch engagement stats');
    }
    
    return data.data!;
  }
}

export const engagementApi = new EngagementApiService();
