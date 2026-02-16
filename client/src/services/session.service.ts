import apiClient from './api';
import type { Session, ApiResponse } from '../types';

export const sessionService = {
  // Get all sessions
  getAllSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<ApiResponse<Session[]>>('/api/sessions');
    return response.data.data || [];
  },

  // Get session by ID
  getSessionById: async (id: string): Promise<Session | null> => {
    const response = await apiClient.get<ApiResponse<Session>>(`/api/sessions/${id}`);
    return response.data.data || null;
  },

  // Create new session
  createSession: async (sessionData: FormData): Promise<Session> => {
    const response = await apiClient.post<ApiResponse<Session>>('/api/sessions', sessionData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  },

  // Delete session
  deleteSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/sessions/${id}`);
  },
};
