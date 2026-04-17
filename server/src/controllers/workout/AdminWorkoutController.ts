import { Request, Response } from "express";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import AdminGlobalSummary from "../../models/AdminGlobalSummary";
import FirmwarePerformance from "../../models/FirmwarePerformance";
import BenchmarkComparisonSummary from "../../models/BenchmarkComparisonSummary";
import UserAccuracySummary from "../../models/UserAccuracySummary";

/**
 * AdminWorkoutController
 * Handles admin workout endpoints
 */
export class AdminWorkoutController {
  /**
   * GET /api/workout/admin/global
   * Get admin global workout summary
   */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await AdminGlobalSummary.findOne({ metric: 'Workout' }).lean();
      
      if (!summary) {
        res.json({
          success: true,
          data: null,
          message: "No workout summary available yet",
        });
        return;
      }
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminWorkoutController] Error getting global summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get global summary",
      });
    }
  }

  /**
   * GET /api/workout/admin/firmware
   * Get firmware performance for workout metric
   */
  static async getFirmwarePerformance(req: Request, res: Response): Promise<void> {
    try {
      const firmwareData = await FirmwarePerformance.find({ metric: 'Workout' })
        .sort({ firmwareVersion: -1 })
        .lean();
      
      res.json({
        success: true,
        data: firmwareData,
      });
    } catch (error: any) {
      console.error("[AdminWorkoutController] Error getting firmware performance:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get firmware performance",
      });
    }
  }

  /**
   * GET /api/workout/admin/benchmark
   * Get benchmark comparison summary for workout metric
   */
  static async getBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const benchmarkData = await BenchmarkComparisonSummary.find({ metric: 'Workout' })
        .lean();
      
      res.json({
        success: true,
        data: benchmarkData,
      });
    } catch (error: any) {
      console.error("[AdminWorkoutController] Error getting benchmark comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get benchmark comparison",
      });
    }
  }

  /**
   * GET /api/workout/admin/user/:userId
   * Get workout summary for a specific user (admin view)
   */
  static async getUserWorkoutSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Get user accuracy summary
      const summary = await UserAccuracySummary.findOne({ 
        userId, 
        metric: 'Workout' 
      }).lean();
      
      // Get all workout sessions for user
      const sessions = await Session.find({ userId, metric: 'Workout' })
        .sort({ startTime: -1 })
        .lean();
      
      // Get analyses
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
      
      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));
      
      // Build session list with workout stats
      const workoutSessions = sessions.map(session => {
        const analysis = analysisMap.get(session._id.toString());
        const workoutStats = (analysis as any)?.workoutStats;
        
        return {
          sessionId: session._id,
          name: session.name,
          sportType: workoutStats?.sportType || 0,
          startTime: session.startTime,
          endTime: session.endTime,
          durationSec: session.durationSec,
          lunaAccuracyPercent: analysis?.lunaAccuracyPercent,
          benchmarkDevice: session.benchmarkDeviceType,
          isValid: session.isValid,
        };
      });

      // Calculate totals
      const totalWorkouts = sessions.length;
      const totalDurationSec = sessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
      
      res.json({
        success: true,
        data: {
          summary: summary || null,
          sessions: workoutSessions,
          totalSessions: sessions.length,
          totalWorkouts,
          totalDurationSec,
        },
      });
    } catch (error: any) {
      console.error("[AdminWorkoutController] Error getting user workout summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user workout summary",
      });
    }
  }

  /**
   * GET /api/workout/admin/sessions
   * Get all workout sessions (for admin overview)
   */
  static async getAllWorkoutSessions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;
      
      const sessions = await Session.find({ metric: 'Workout' })
        .populate('userId', 'name email')
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      const total = await Session.countDocuments({ metric: 'Workout' });
      
      // Get analyses for sessions
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
      
      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));
      
      const sessionsWithStats = sessions.map(session => {
        const analysis = analysisMap.get(session._id.toString());
        const workoutStats = (analysis as any)?.workoutStats;
        
        return {
          ...session,
          sportType: workoutStats?.sportType || 0,
          lunaAccuracyPercent: analysis?.lunaAccuracyPercent,
        };
      });
      
      res.json({
        success: true,
        data: {
          sessions: sessionsWithStats,
          total,
          limit,
          skip,
        },
      });
    } catch (error: any) {
      console.error("[AdminWorkoutController] Error getting all workout sessions:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get workout sessions",
      });
    }
  }
}
