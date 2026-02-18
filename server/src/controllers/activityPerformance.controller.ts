import { Request, Response } from 'express';
import ActivityPerformanceSummary from '../models/ActivityPerformanceSummay';

/**
 * Get all activity performance summaries
 */
export const getAllActivityPerformance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const summaries = await ActivityPerformanceSummary.find()
      .sort({ totalSessions: -1 })
      .exec();

    res.status(200).json({
      success: true,
      count: summaries.length,
      data: summaries,
    });
  } catch (error) {
    console.error('Error fetching activity performance summaries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity performance summaries',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get activity performance summary for a specific activity type
 */
export const getActivityPerformance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { activityType } = req.params;

    const summary = await ActivityPerformanceSummary.findOne({ activityType });

    if (!summary) {
      res.status(404).json({
        success: false,
        message: `No performance data found for activity: ${activityType}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching activity performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity performance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
