import { Request, Response } from "express";
import { AdminActivitySummaryService } from "../../services/activity/AdminActivitySummaryService";
import { UserActivitySummaryService } from "../../services/activity/UserActivitySummaryService";

/**
 * AdminActivityController
 * Handles admin-facing activity analytics endpoints
 */
export class AdminActivityController {
  /**
   * GET /api/activity/admin/global-summary
   * Admin Global Activity Summary
   * Query params: latestFirmwareOnly (boolean)
   */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const latestFirmwareOnly = req.query.latestFirmwareOnly === "true";

      const summary = await AdminActivitySummaryService.getGlobalSummary(latestFirmwareOnly);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting global summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get global summary",
      });
    }
  }

  /**
   * GET /api/activity/admin/firmware-comparison
   * Firmware-Wise Activity Comparison
   */
  static async getFirmwareComparison(req: Request, res: Response): Promise<void> {
    try {
      const comparison = await AdminActivitySummaryService.getFirmwareComparison();
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting firmware comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get firmware comparison",
      });
    }
  }

  /**
   * GET /api/activity/admin/benchmark-comparison
   * Benchmark Device Activity Comparison
   */
  static async getBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const comparison = await AdminActivitySummaryService.getBenchmarkComparison();
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting benchmark comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get benchmark comparison",
      });
    }
  }

  /**
   * GET /api/activity/admin/user/:userId
   * Admin User Activity Summary
   */
  static async getAdminUserSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const summary = await AdminActivitySummaryService.getAdminUserSummary(userId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting admin user summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get admin user summary",
      });
    }
  }

  /**
   * GET /api/activity/admin/user/:userId/firmware-comparison
   * Get firmware comparison for specific user
   */
  static async getUserFirmwareComparison(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const comparison = await AdminActivitySummaryService.getUserFirmwareComparison(userId);
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting user firmware comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user firmware comparison",
      });
    }
  }

  /**
   * GET /api/activity/admin/user/:userId/benchmark-comparison
   * Get benchmark comparison for specific user
   */
  static async getUserBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const comparison = await AdminActivitySummaryService.getUserBenchmarkComparison(userId);
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting user benchmark comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user benchmark comparison",
      });
    }
  }

  /**
   * GET /api/activity/admin/session/:sessionId
   * Admin Activity Session Level Summary
   */
  static async getAdminSessionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const summary = await AdminActivitySummaryService.getAdminSessionSummary(sessionId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting admin session summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get admin session summary",
      });
    }
  }

  /**
   * GET /api/activity/admin/accuracy-trend
   * Get accuracy trend over time
   * Query params: startDate, endDate
   */
  static async getAccuracyTrend(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const trend = await AdminActivitySummaryService.getAccuracyTrend(startDate, endDate);
      
      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting accuracy trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get accuracy trend",
      });
    }
  }

  /**
   * GET /api/activity/admin/user/:userId/trend
   * Get activity trend for specific user
   */
  static async getUserActivityTrend(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const trend = await AdminActivitySummaryService.getUserActivityTrend(userId);
      
      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      console.error("[AdminActivityController] Error getting user activity trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get user activity trend",
      });
    }
  }
}
