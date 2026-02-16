// Common type definitions

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  startTime: string;
  endTime?: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  firmware?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
