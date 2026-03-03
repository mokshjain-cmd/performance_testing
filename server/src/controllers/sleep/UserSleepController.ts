import { Request, Response } from "express";
import { UserSleepSummaryService } from "../../services/sleep/UserSleepSummaryService";

/**
 * UserSleepController
 * Handles user-facing sleep endpoints
 */
export class UserSleepController {
  /**
   * GET /api/sleep/overview
   * Get user sleep overview (1A - across all sessions)
   */
  static async getUserSleepOverview(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const overview = await UserSleepSummaryService.getUserSleepOverview(userId);
      
      res.json({
        success: true,
        data: overview,
      });
    } catch (error: any) {
      console.error("[UserSleepController] Error getting overview:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get sleep overview",
      });
    }
  }

  /**
   * GET /api/sleep/session/:sessionId
   * Get single session detailed view (1B)
   */
  static async getSingleSessionView(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // TODO: Verify user owns this session

      const sessionView = await UserSleepSummaryService.getSingleSessionView(sessionId);
      
      res.json({
        success: true,
        data: sessionView,
      });
    } catch (error: any) {
      console.error("[UserSleepController] Error getting session view:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get session view",
      });
    }
  }

  /**
   * GET /api/sleep/trend
   * Get sleep trend data for charts
   */
  static async getSleepTrend(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const trendData = await UserSleepSummaryService.getSleepTrend(userId);
      
      res.json({
        success: true,
        data: trendData,
      });
    } catch (error: any) {
      console.error("[UserSleepController] Error getting sleep trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get sleep trend",
      });
    }
  }

  /**
   * GET /api/sleep/architecture
   * Get sleep architecture distribution (for pie chart)
   */
  static async getSleepArchitecture(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const distribution = await UserSleepSummaryService.getSleepArchitectureDistribution(userId);
      
      res.json({
        success: true,
        data: distribution,
      });
    } catch (error: any) {
      console.error("[UserSleepController] Error getting architecture:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get sleep architecture",
      });
    }
  }

  /**
   * GET /api/sleep/hypnogram/:sessionId
   * Get hypnogram data for a single session
   */
  static async getHypnogram(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // TODO: Verify user owns this session

      const hypnogramData = await UserSleepSummaryService.getHypnogramData(sessionId);
      
      res.json({
        success: true,
        data: hypnogramData,
      });
    } catch (error: any) {
      console.error("[UserSleepController] Error getting hypnogram:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get hypnogram data",
      });
    }
  }
}
