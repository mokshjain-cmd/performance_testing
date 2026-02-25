import apiClient from './api';

export type Device = {
  _id: string;
  deviceType: string;
  hardwareVersion: string;
  firmwareVersion: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDeviceRequest = {
  deviceType: string;
  hardwareVersion: string;
  firmwareVersion: string;
};

export const deviceService = {
  getAllDevices: async () => {
    const response = await apiClient.get<{
      success: boolean;
      count: number;
      data: Device[];
    }>('/devices');
    return response.data;
  },

  createDevice: async (device: CreateDeviceRequest) => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: Device;
    }>('/devices', device);
    return response.data;
  },

  deleteDevice: async (deviceId: string) => {
    const response = await apiClient.delete<{
      success: boolean;
      message: string;
    }>(`/devices/${deviceId}`);
    return response.data;
  },
};
