import { Request, Response } from "express";
import { UserActivitySummaryService } from "../../services/activity/UserActivitySummaryService";

/**
 * UserActivityController
 * Handles user-facing activity endpoints
 */
export class UserActivityController {
  /**
   * GET /api/activity/overview
   * Get user activity overview (across all sessions)
   */
  static async getUserActivityOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const overview = await UserActivitySummaryService.getUserActivityOverview(userId);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      console.error("[UserActivityController] Error getting activity overview:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get activity overview",
      });
    }
  }

  /**
   * GET /api/activity/session/:sessionId
   * Get single activity session detailed view
   */
  static async getSingleSessionView(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const includeDailyData = req.query.includeDailyData !== 'false';

      const sessionView = await UserActivitySummaryService.getSingleSessionView(
        sessionId,
        includeDailyData
      );
      
      res.json({
        success: true,
        data: sessionView,
      });
    } catch (error: any) {
      console.error("[UserActivityController] Error getting session view:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get session view",
      });
    }
  }

  /**
   * GET /api/activity/trend
   * Get activity trend data for charts
   */
  static async getActivityTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const trendData = await UserActivitySummaryService.getActivityTrend(userId);
      
      res.json({
        success: true,
        data: trendData,
      });
    } catch (error: any) {
      console.error("[UserActivityController] Error getting activity trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get activity trend",
      });
    }
  }
}
