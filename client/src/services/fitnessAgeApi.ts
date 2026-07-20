import type {
  MyFitnessAgeResponse,
  FitnessAgeAdminListItem,
  FitnessAgeProfile,
} from '../types/fitnessAge';
import { API_BASE_URL } from '../lib/config';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class FitnessAgeApiService {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /** The logged-in user's own Fitness Age (or a not-linked/not-computed state). */
  async getMyFitnessAge(): Promise<MyFitnessAgeResponse> {
    const response = await fetch(`${API_BASE_URL}/fitness-age/me`, {
      headers: this.getHeaders(),
    });
    const data: MyFitnessAgeResponse = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch your fitness age');
    }
    return data;
  }

  /** Admin only — every user we have a Fitness Age snapshot for. */
  async getAdminUsersList(): Promise<FitnessAgeAdminListItem[]> {
    const response = await fetch(`${API_BASE_URL}/fitness-age/admin/users`, {
      headers: this.getHeaders(),
    });
    const data: ApiResponse<FitnessAgeAdminListItem[]> = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch fitness age users');
    }
    return data.data || [];
  }

  /** Admin only — full detail for one user. */
  async getAdminUserDetail(fitnessAppUserId: number): Promise<FitnessAgeProfile> {
    const response = await fetch(`${API_BASE_URL}/fitness-age/admin/users/${fitnessAppUserId}`, {
      headers: this.getHeaders(),
    });
    const data: ApiResponse<FitnessAgeProfile> = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch fitness age detail');
    }
    return data.data!;
  }
}

export const fitnessAgeApi = new FitnessAgeApiService();
