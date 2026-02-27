import { Request, Response } from 'express';
import AdminDailyTrend from '../models/AdminDailyTrend';

/**
 * Get admin daily trends
 * Optionally filter by startDate (from startDate to today)
 * Query params: startDate (ISO date string, e.g., 2024-01-01), metric (optional, defaults to 'HR')
 */
export const getAdminDailyTrends = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { startDate } = req.query;
    const metric = (req.query.metric as string) || 'HR';

    let filter: any = { metric };

    if (startDate) {
      // Parse startDate and normalize to midnight UTC
      const start = new Date(startDate as string);
      start.setUTCHours(0, 0, 0, 0);

      // Set end date to today at midnight UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (!isNaN(start.getTime())) {
        filter.date = {
          $gte: start,
          $lte: today,
        };
      }
    }

    const trends = await AdminDailyTrend.find(filter)
      .sort({ date: 1 }) // Sort by date ascending (oldest to newest)
      .exec();

    res.status(200).json({
      success: true,
      count: trends.length,
      data: trends,
    });
  } catch (error) {
    console.error('Error fetching admin daily trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin daily trends',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get admin daily trend for a specific date
 * Query params: metric (optional, defaults to 'HR')
 */
export const getAdminDailyTrendByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { date } = req.params;
    const metric = (req.query.metric as string) || 'HR';

    // Parse and normalize to midnight UTC
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    if (isNaN(targetDate.getTime())) {
      res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD',
      });
      return;
    }

    const trend = await AdminDailyTrend.findOne({ date: targetDate, metric });

    if (!trend) {
      res.status(404).json({
        success: false,
        message: `No trend data found for date: ${date}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: trend,
    });
  } catch (error) {
    console.error('Error fetching admin daily trend:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin daily trend',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
