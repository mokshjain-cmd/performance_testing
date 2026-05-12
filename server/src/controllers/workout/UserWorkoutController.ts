import { Request, Response } from "express";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import WorkoutReading from "../../models/WorkoutReading";
import UserAccuracySummary from "../../models/UserAccuracySummary";

/**
 * UserWorkoutController
 * Handles user-facing workout endpoints
 */
export class UserWorkoutController {
  /**
   * GET /api/workout/overview
   * Get user workout overview (summary stats)
   */
  static async getUserWorkoutOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get user accuracy summary for workout metric
      const summary = await UserAccuracySummary.findOne({ userId, metric: 'Workout' });
      
      // Get recent workout sessions
      const recentSessions = await Session.find({ userId, metric: 'Workout', isValid: true })
        .sort({ startTime: -1 })
        .limit(10)
        .lean();
      
      // Get analyses for recent sessions
      const sessionIds = recentSessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
      
      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));
      
      // Build workout list with stats
      const workouts = recentSessions.map(session => {
        const analysis = analysisMap.get(session._id.toString());
        const workoutStats = (analysis as any)?.workoutStats;
        
        return {
          sessionId: session._id,
          sportType: workoutStats?.sportType || 0,
          startTime: session.startTime,
          endTime: session.endTime,
          durationSec: session.durationSec,
          hr: workoutStats?.hr || { avg: 0, max: 0, min: 0 },
          calories: workoutStats?.calories || 0,
          steps: workoutStats?.steps || 0,
          distance: workoutStats?.distance || 0,
          lunaAccuracyPercent: analysis?.lunaAccuracyPercent,
          benchmarkDevice: session.benchmarkDeviceType,
        };
      });

      // Calculate total duration
      const totalDurationSec = recentSessions.reduce((sum, s) => sum + (s.durationSec || 0), 0);
      
      res.json({
        success: true,
        data: {
          summary: summary || null,
          totalWorkouts: recentSessions.length,
          totalDurationSec,
          workouts,
        },
      });
    } catch (error: any) {
      console.error("[UserWorkoutController] Error getting workout overview:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get workout overview",
      });
    }
  }

  /**
   * GET /api/workout/session/:sessionId
   * Get single workout session detailed view
   */
  static async getWorkoutSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const includeReadings = req.query.includeReadings !== 'false';

      // Get session
      const session = await Session.findById(sessionId).lean();
      if (!session) {
        res.status(404).json({ success: false, error: "Session not found" });
        return;
      }

      // Get analysis
      const analysis = await SessionAnalysis.findOne({ sessionId }).lean();
      
      // Build response
      const response: any = {
        session,
        analysis,
        workoutStats: (analysis as any)?.workoutStats || null,
        pairwiseComparisons: (analysis as any)?.pairwiseComparisons || [],
      };

      // Include readings if requested
      if (includeReadings) {
        const readings = await WorkoutReading.find({ "meta.sessionId": sessionId })
          .sort({ timestamp: 1 })
          .lean();
        
        // Group by device type
        const lunaReadings = readings.filter(r => r.meta.deviceType === 'luna');
        const benchmarkReadings = readings.filter(r => r.meta.deviceType !== 'luna');
        
        response.readings = {
          luna: lunaReadings.map(r => ({
            timestamp: r.timestamp,
            heartRate: r.heartRate,
          })),
          benchmark: benchmarkReadings.length > 0 ? benchmarkReadings.map(r => ({
            timestamp: r.timestamp,
            heartRate: r.heartRate,
            deviceType: r.meta.deviceType,
          })) : null,
        };
      }
      
      res.json({
        success: true,
        data: response,
      });
    } catch (error: any) {
      console.error("[UserWorkoutController] Error getting session view:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get session view",
      });
    }
  }

  /**
   * GET /api/workout/session/:sessionId/readings
   * Get workout readings only (for separate data fetch)
   */
  static async getWorkoutReadings(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const readings = await WorkoutReading.find({ "meta.sessionId": sessionId })
        .sort({ timestamp: 1 })
        .lean();
      
      // Group by device type
      const lunaReadings = readings.filter(r => r.meta.deviceType === 'luna');
      const benchmarkReadings = readings.filter(r => r.meta.deviceType !== 'luna');
      
      res.json({
        success: true,
        data: {
          luna: lunaReadings.map(r => ({
            timestamp: r.timestamp,
            heartRate: r.heartRate,
          })),
          benchmark: benchmarkReadings.length > 0 ? benchmarkReadings.map(r => ({
            timestamp: r.timestamp,
            heartRate: r.heartRate,
            deviceType: r.meta.deviceType,
          })) : null,
          totalCount: readings.length,
          lunaCount: lunaReadings.length,
          benchmarkCount: benchmarkReadings.length,
        },
      });
    } catch (error: any) {
      console.error("[UserWorkoutController] Error getting readings:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get workout readings",
      });
    }
  }

  /**
   * GET /api/workout/trend
   * Get workout trend data for charts
   */
  static async getWorkoutTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Get all workout sessions for user
      const sessions = await Session.find({ userId, metric: 'Workout', isValid: true })
        .sort({ startTime: 1 })
        .lean();
      
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
      
      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));
      
      // Build trend data with full metrics
      const trendData = sessions.map(session => {
        const analysis = analysisMap.get(session._id.toString()) as any;
        const workoutStats = analysis?.workoutStats;
        const hrComparison = workoutStats?.benchmarkComparison;
        
        return {
          date: session.startTime,
          sessionId: session._id.toString(),
          sportType: workoutStats?.sportType || 0,
          durationSec: session.durationSec || 0,
          // HR Accuracy metrics
          lunaAccuracyPercent: analysis?.lunaAccuracyPercent || null,
          mae: hrComparison?.mae || null,
          rmse: hrComparison?.rmse || null,
          pearsonR: hrComparison?.pearsonR || null,
          mape: hrComparison?.mape || null,
          meanBias: hrComparison?.meanBias || null,
          // Calories
          lunaCalories: workoutStats?.lunaCalories || null,
          benchmarkCalories: workoutStats?.benchmarkCalories || null,
          caloriesBias: workoutStats?.caloriesDifference || null,
        };
      });
      
      res.json({
        success: true,
        data: trendData,
      });
    } catch (error: any) {
      console.error("[UserWorkoutController] Error getting trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get workout trend",
      });
    }
  }
}
