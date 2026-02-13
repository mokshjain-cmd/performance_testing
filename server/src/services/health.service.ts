import mongoose from 'mongoose';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  database: {
    connected: boolean;
    status: string;
  };
}

export class HealthService {
  public async checkHealth(): Promise<HealthStatus> {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbStatus === 1,
        status: dbStatusMap[dbStatus] || 'unknown'
      }
    };
  }
}
