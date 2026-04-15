import { Request, Response } from "express";
import { UserSkinTempSummaryService } from "../../services/skintemp/UserSkinTempSummaryService";

/**
 * UserSkinTempController
 * Handles user-facing skin temperature endpoints
 */
export class UserSkinTempController {
  /**
   * GET /api/skintemp/overview
   * Get user SkinTemp overview (across all sessions)
   */
  static async getUserSkinTempOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const overview = await UserSkinTempSummaryService.getUserSkinTempOverview(userId);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      console.error("[UserSkinTempController] Error getting skintemp overview:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get skin temperature overview",
      });
    }
  }

  /**
   * GET /api/skintemp/session/:sessionId
   * Get single SkinTemp session detailed view
   */
  static async getSingleSessionView(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const includeReadings = req.query.includeReadings !== 'false';

      const sessionView = await UserSkinTempSummaryService.getSingleSessionView(
        sessionId,
        includeReadings
      );
      
      res.json({
        success: true,
        data: sessionView,
      });
    } catch (error: any) {
      console.error("[UserSkinTempController] Error getting session view:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get session view",
      });
    }
  }

  /**
   * GET /api/skintemp/trend
   * Get SkinTemp trend data for charts
   */
  static async getSkinTempTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const trendData = await UserSkinTempSummaryService.getSkinTempTrend(userId);
      
      res.json({
        success: true,
        data: trendData,
      });
    } catch (error: any) {
      console.error("[UserSkinTempController] Error getting skintemp trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get skin temperature trend",
      });
    }
  }
}
