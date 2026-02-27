import { Request, Response } from 'express';
import AdminGlobalSummary from '../models/AdminGlobalSummary';

/**
 * Get admin global summary
 * Returns the latest global summary (single document)
 * Query params: metric (optional, defaults to 'HR')
 */
export const getAdminGlobalSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const metric = (req.query.metric as string) || 'HR';
    
    const summary = await AdminGlobalSummary.findOne({ metric })
      .sort({ computedAt: -1 }) // Get the most recent one
      .exec();

    if (!summary) {
      res.status(404).json({
        success: false,
        message: 'No global summary found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Error fetching admin global summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin global summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
