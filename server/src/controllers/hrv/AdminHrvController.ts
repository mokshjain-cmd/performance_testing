import { Request, Response } from 'express';
import Session from '../../models/Session';
import SessionAnalysis from '../../models/SessionAnalysis';
import AdminGlobalSummary from '../../models/AdminGlobalSummary';
import FirmwarePerformance from '../../models/FirmwarePerformance';
import BenchmarkComparisonSummary from '../../models/BenchmarkComparisonSummary';
import AdminDailyTrend from '../../models/AdminDailyTrend';
import { UserHrvSummaryService } from '../../services/hrv/UserHrvSummaryService';

/**
 * AdminHrvController
 * Lean admin endpoints — reads the generic cached summary models directly
 * (populated automatically via the existing generic aggregation services,
 * since HRV's comparison is routed through pairwiseComparisons), no
 * recomputation on read.
 */
export class AdminHrvController {
  /** GET /api/hrv/admin/global */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await AdminGlobalSummary.findOne({ metric: 'HRV' }).lean();
      res.json({ success: true, data: summary || null });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting global summary:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get global summary' });
    }
  }

  /** GET /api/hrv/admin/daily-trend?days=30 — per-day avg bias across users */
  static async getDailyTrend(req: Request, res: Response): Promise<void> {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const trend = await AdminDailyTrend.find({ metric: 'HRV', date: { $gte: since } })
        .sort({ date: 1 })
        .lean();

      res.json({ success: true, data: trend });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting daily trend:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get daily trend' });
    }
  }

  /** GET /api/hrv/admin/firmware — total sessions + avg bias per firmware version */
  static async getFirmwarePerformance(req: Request, res: Response): Promise<void> {
    try {
      const firmwareData = await FirmwarePerformance.find({ metric: 'HRV' })
        .sort({ firmwareVersion: -1 })
        .lean();
      res.json({ success: true, data: firmwareData });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting firmware performance:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get firmware performance' });
    }
  }

  /** GET /api/hrv/admin/benchmark — total sessions + avg bias per benchmark device */
  static async getBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const benchmarkData = await BenchmarkComparisonSummary.find({ metric: 'HRV' }).lean();
      res.json({ success: true, data: benchmarkData });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting benchmark comparison:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get benchmark comparison' });
    }
  }

  /** GET /api/hrv/admin/user/:userId */
  static async getUserHrvSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const overview = await UserHrvSummaryService.getUserHrvOverview(userId);
      const recentNights = await UserHrvSummaryService.getRecentNights(userId, 5);

      res.json({ success: true, data: { ...overview, recentNights } });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting user HRV summary:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get user HRV summary' });
    }
  }

  /** GET /api/hrv/admin/user/:userId/trend?days=10|30 — day-bucketed Falcon-vs-benchmark HRV trend for one user */
  static async getUserHrvTrend(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string, 10) || 30;
      const trend = await UserHrvSummaryService.getHrvTrend(userId, days);
      res.json({ success: true, data: trend });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting user HRV trend:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get user HRV trend' });
    }
  }

  /** GET /api/hrv/admin/sessions?limit=&skip= */
  static async getAllHrvSessions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const skip = parseInt(req.query.skip as string, 10) || 0;

      const sessions = await Session.find({ metric: 'HRV' })
        .populate('userId', 'name email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Session.countDocuments({ metric: 'HRV' });

      const sessionIds = sessions.map((s) => s._id);
      const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
      const analysisMap = new Map(analyses.map((a) => [String(a.sessionId), a]));

      const sessionsWithStats = sessions.map((session) => ({
        ...session,
        hrvStats: (analysisMap.get(String(session._id)) as any)?.hrvStats || null,
      }));

      res.json({ success: true, data: { sessions: sessionsWithStats, total, limit, skip } });
    } catch (error: any) {
      console.error('[AdminHrvController] Error getting all HRV sessions:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to get HRV sessions' });
    }
  }
}
