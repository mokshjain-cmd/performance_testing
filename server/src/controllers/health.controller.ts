import { Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * Get health status of the application
 */
export const getHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const dbStatusMap: { [key: number]: string } = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        connected: dbStatus === 1,
        status: dbStatusMap[dbStatus] || 'unknown'
      }
    };
    
    res.status(200).json({
      success: true,
      data: healthData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
