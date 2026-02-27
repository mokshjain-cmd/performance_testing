import { Request, Response } from 'express';
import FirmwarePerformance from '../models/FirmwarePerformance';

/**
 * Get all firmware performance data
 * Query params: metric (optional, defaults to 'HR')
 */
export const getAllFirmwarePerformance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const metric = (req.query.metric as string) || 'HR';
    
    const performances = await FirmwarePerformance.find({ metric })
      .sort({ firmwareVersion: -1 }) // Sort by version descending (newest first)
      .exec();

    res.status(200).json({
      success: true,
      count: performances.length,
      data: performances,
    });
  } catch (error) {
    console.error('Error fetching firmware performance data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch firmware performance data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get firmware performance for a specific version
 * Query params: metric (optional, defaults to 'HR')
 */
export const getFirmwarePerformance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { version } = req.params;
    const metric = (req.query.metric as string) || 'HR';

    const performance = await FirmwarePerformance.findOne({
      firmwareVersion: version,
      metric,
    });

    if (!performance) {
      res.status(404).json({
        success: false,
        message: `No performance data found for firmware version: ${version}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error('Error fetching firmware performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch firmware performance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
