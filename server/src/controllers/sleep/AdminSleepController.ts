import { Request, Response } from "express";
import { AdminSleepSummaryService } from "../../services/sleep/AdminSleepSummaryService";
import { UserSleepSummaryService } from "../../services/sleep/UserSleepSummaryService";

/**
 * AdminSleepController
 * Handles admin-facing sleep analytics endpoints
 */
export class AdminSleepController {
  /**
   * GET /api/admin/sleep/global-summary
   * 2A) Admin Global Summary
   * Query params: latestFirmwareOnly (boolean)
   */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const latestFirmwareOnly = req.query.latestFirmwareOnly === "true";

      const summary = await AdminSleepSummaryService.getGlobalSummary(latestFirmwareOnly);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting global summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get global summary",
      });
    }
  }

  /**
   * GET /api/admin/sleep/firmware-comparison
   * 2B) Firmware-Wise Comparison
   */
  static async getFirmwareComparison(req: Request, res: Response): Promise<void> {
    try {
      const comparison = await AdminSleepSummaryService.getFirmwareComparison();
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting firmware comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get firmware comparison",
      });
    }
  }

  /**
   * GET /api/admin/sleep/benchmark-comparison
   * 2C) Benchmark Device Comparison
   */
  static async getBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const comparison = await AdminSleepSummaryService.getBenchmarkComparison();
      
      res.json({
        success: true,
        data: comparison,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting benchmark comparison:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get benchmark comparison",
      });
    }
  }

  /**
   * GET /api/admin/sleep/user/:userId
   * 2D) Admin User Summary
   */
  static async getAdminUserSummary(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const summary = await AdminSleepSummaryService.getAdminUserSummary(userId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting admin user summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get admin user summary",
      });
    }
  }

  /**
   * GET /api/admin/sleep/session/:sessionId
   * 2E) Admin Session Level Summary (most technical)
   */
  static async getAdminSessionSummary(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const summary = await AdminSleepSummaryService.getAdminSessionSummary(sessionId);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting admin session summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get admin session summary",
      });
    }
  }

  /**
   * GET /api/admin/sleep/accuracy-trend
   * Get accuracy trend over time
   * Query params: startDate, endDate
   */
  static async getAccuracyTrend(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const trend = await AdminSleepSummaryService.getAccuracyTrend(startDate, endDate);
      
      res.json({
        success: true,
        data: trend,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting accuracy trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get accuracy trend",
      });
    }
  }

  /**
   * GET /api/admin/sleep/hypnogram/:sessionId
   * Get hypnogram data for admin view (includes dual overlay)
   */
  static async getAdminHypnogram(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const hypnogramData = await UserSleepSummaryService.getHypnogramData(sessionId);
      
      res.json({
        success: true,
        data: hypnogramData,
      });
    } catch (error: any) {
      console.error("[AdminSleepController] Error getting hypnogram:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get hypnogram data",
      });
    }
  }
}
