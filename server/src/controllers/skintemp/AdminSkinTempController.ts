import { Request, Response } from "express";
import { AdminSkinTempSummaryService } from "../../services/skintemp/AdminSkinTempSummaryService";

/**
 * AdminSkinTempController
 * Handles admin-facing skin temperature endpoints
 */
export class AdminSkinTempController {
  /**
   * GET /api/admin/skintemp/global
   * Get admin global SkinTemp summary
   */
  static async getGlobalSummary(req: Request, res: Response): Promise<void> {
    try {
      const latestFirmwareOnly = req.query.latestFirmwareOnly === 'true';
      
      const summary = await AdminSkinTempSummaryService.getGlobalSummary(latestFirmwareOnly);
      
      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error("[AdminSkinTempController] Error getting global summary:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get global skin temperature summary",
      });
    }
  }

  /**
   * GET /api/admin/skintemp/trend
   * Get SkinTemp accuracy trend data
   */
  static async getAccuracyTrend(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      const trendData = await AdminSkinTempSummaryService.getAccuracyTrend(
        startDate as string,
        endDate as string
      );
      
      res.json({
        success: true,
        data: trendData,
      });
    } catch (error: any) {
      console.error("[AdminSkinTempController] Error getting trend:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to get skin temperature trend",
      });
    }
  }
}
