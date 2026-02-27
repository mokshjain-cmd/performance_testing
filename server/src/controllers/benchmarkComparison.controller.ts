import { Request, Response } from 'express';
import BenchmarkComparisonSummary from '../models/BenchmarkComparisonSummary';

/**
 * Get all benchmark comparison summaries
 * Query params: metric (optional, defaults to 'HR')
 */
export const getAllBenchmarkComparisons = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const metric = (req.query.metric as string) || 'HR';
    
    const summaries = await BenchmarkComparisonSummary.find({ metric })
      .sort({ totalSessions: -1 })
      .exec();

    res.status(200).json({
      success: true,
      count: summaries.length,
      data: summaries,
    });
  } catch (error) {
    console.error('Error fetching benchmark comparison summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch benchmark comparison summaries',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get benchmark comparison summary for a specific device
 * Query params: metric (optional, defaults to 'HR')
 */
export const getBenchmarkComparison = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { deviceType } = req.params;
    const metric = (req.query.metric as string) || 'HR';

    const summary = await BenchmarkComparisonSummary.findOne({
      benchmarkDeviceType: deviceType,
      metric,
    });

    if (!summary) {
      res.status(404).json({
        success: false,
        message: `No comparison data found for device: ${deviceType}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching benchmark comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch benchmark comparison',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
