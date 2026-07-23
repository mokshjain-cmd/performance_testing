import { Request, Response } from 'express';
import Session from '../../models/Session';
import SessionAnalysis from '../../models/SessionAnalysis';
import HrvReading from '../../models/HrvReading';
import { UserHrvSummaryService } from '../../services/hrv/UserHrvSummaryService';

/**
 * UserHrvController
 * Handles user-facing HRV endpoints
 */
export class UserHrvController {
  /**
   * GET /api/hrv/overview
   */
  static async getUserHrvOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const overview = await UserHrvSummaryService.getUserHrvOverview(userId);
      const recentNights = await UserHrvSummaryService.getRecentNights(userId, 5);

      res.json({ success: true, data: { ...overview, recentNights } });
    } catch (error: any) {
      console.error('[UserHrvController] Error getting overview:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get HRV overview' });
    }
  }

  /**
   * GET /api/hrv/trend?days=10|30
   */
  static async getHrvTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const days = parseInt(req.query.days as string, 10) || 30;
      const trend = await UserHrvSummaryService.getHrvTrend(userId, days);

      res.json({ success: true, data: trend });
    } catch (error: any) {
      console.error('[UserHrvController] Error getting trend:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get HRV trend' });
    }
  }

  /**
   * GET /api/hrv/session/:sessionId
   */
  static async getHrvSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const session = await Session.findById(sessionId).lean();
      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const analysis = await SessionAnalysis.findOne({ sessionId }).lean();

      res.json({
        success: true,
        data: {
          session,
          hrvStats: (analysis as any)?.hrvStats || null,
        },
      });
    } catch (error: any) {
      console.error('[UserHrvController] Error getting session view:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get HRV session' });
    }
  }

  /**
   * GET /api/hrv/session/:sessionId/readings
   */
  static async getHrvReadings(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const readings = await HrvReading.find({ 'meta.sessionId': sessionId }).sort({ timestamp: 1 }).lean();
      const lunaReadings = readings.filter((r) => r.meta.deviceType === 'luna');
      const benchmarkReadings = readings.filter((r) => r.meta.deviceType !== 'luna');

      res.json({
        success: true,
        data: {
          luna: lunaReadings.map((r) => ({ timestamp: r.timestamp, hrv: r.hrv, hr: r.hr })),
          benchmark:
            benchmarkReadings.length > 0
              ? benchmarkReadings.map((r) => ({
                  timestamp: r.timestamp,
                  hrv: r.hrv,
                  hr: r.hr,
                  deviceType: r.meta.deviceType,
                }))
              : null,
        },
      });
    } catch (error: any) {
      console.error('[UserHrvController] Error getting readings:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get HRV readings' });
    }
  }
}
