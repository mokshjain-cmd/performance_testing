import { Router } from "express";
import { UserSkinTempController } from "../controllers/skintemp/UserSkinTempController";
import { AdminSkinTempController } from "../controllers/skintemp/AdminSkinTempController";

const router = Router();

// ====================================
// USER SKINTEMP ROUTES
// ====================================

/**
 * @route   GET /api/skintemp/overview
 * @desc    Get user SkinTemp overview (across all sessions)
 * @access  Private (User)
 */
router.get("/overview", UserSkinTempController.getUserSkinTempOverview);

/**
 * @route   GET /api/skintemp/session/:sessionId
 * @desc    Get single SkinTemp session detailed view
 * @access  Private (User)
 */
router.get("/session/:sessionId", UserSkinTempController.getSingleSessionView);

/**
 * @route   GET /api/skintemp/trend
 * @desc    Get SkinTemp trend data for charts
 * @access  Private (User)
 */
router.get("/trend", UserSkinTempController.getSkinTempTrend);

// ====================================
// ADMIN SKINTEMP ROUTES
// ====================================

/**
 * @route   GET /api/skintemp/admin/global
 * @desc    Get admin global SkinTemp summary
 * @access  Private (Admin)
 */
router.get("/admin/global", AdminSkinTempController.getGlobalSummary);

/**
 * @route   GET /api/skintemp/admin/trend
 * @desc    Get SkinTemp accuracy trend over time
 * @access  Private (Admin)
 */
router.get("/admin/trend", AdminSkinTempController.getAccuracyTrend);

/**
 * @route   GET /api/skintemp/admin/firmware
 * @desc    Get firmware comparison for SkinTemp (bias-only)
 * @access  Private (Admin)
 */
router.get("/admin/firmware", AdminSkinTempController.getFirmwareComparison);

/**
 * @route   GET /api/skintemp/admin/benchmark
 * @desc    Get benchmark comparison for SkinTemp (bias-only)
 * @access  Private (Admin)
 */
router.get("/admin/benchmark", AdminSkinTempController.getBenchmarkComparison);

export default router;
