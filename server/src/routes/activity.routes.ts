import { Router } from "express";
import { UserActivityController } from "../controllers/activity/UserActivityController";
import { AdminActivityController } from "../controllers/activity/AdminActivityController";

const router = Router();

// ====================================
// USER ACTIVITY ROUTES
// ====================================

/**
 * @route   GET /api/activity/overview
 * @desc    Get user activity overview (across all sessions)
 * @access  Private (User)
 */
router.get("/overview", UserActivityController.getUserActivityOverview);

/**
 * @route   GET /api/activity/session/:sessionId
 * @desc    Get single activity session detailed view
 * @access  Private (User)
 */
router.get("/session/:sessionId", UserActivityController.getSingleSessionView);

/**
 * @route   GET /api/activity/trend
 * @desc    Get activity trend data for charts
 * @access  Private (User)
 */
router.get("/trend", UserActivityController.getActivityTrend);

// ====================================
// ADMIN ACTIVITY ROUTES
// ====================================

/**
 * @route   GET /api/activity/admin/global-summary
 * @desc    Admin Global Activity Summary
 * @query   latestFirmwareOnly (boolean)
 * @access  Private (Admin)
 */
router.get("/admin/global-summary", AdminActivityController.getGlobalSummary);

/**
 * @route   GET /api/activity/admin/firmware-comparison
 * @desc    Firmware-Wise Activity Comparison
 * @access  Private (Admin)
 */
router.get("/admin/firmware-comparison", AdminActivityController.getFirmwareComparison);

/**
 * @route   GET /api/activity/admin/benchmark-comparison
 * @desc    Benchmark Device Activity Comparison
 * @access  Private (Admin)
 */
router.get("/admin/benchmark-comparison", AdminActivityController.getBenchmarkComparison);

/**
 * @route   GET /api/activity/admin/user/:userId
 * @desc    Admin User Activity Summary
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId", AdminActivityController.getAdminUserSummary);

/**
 * @route   GET /api/activity/admin/user/:userId/firmware-comparison
 * @desc    Get firmware comparison for specific user
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId/firmware-comparison", AdminActivityController.getUserFirmwareComparison);

/**
 * @route   GET /api/activity/admin/user/:userId/benchmark-comparison
 * @desc    Get benchmark comparison for specific user
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId/benchmark-comparison", AdminActivityController.getUserBenchmarkComparison);

/**
 * @route   GET /api/activity/admin/user/:userId/trend
 * @desc    Get activity trend for specific user
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId/trend", AdminActivityController.getUserActivityTrend);

/**
 * @route   GET /api/activity/admin/session/:sessionId
 * @desc    Admin Activity Session Level Summary
 * @access  Private (Admin)
 */
router.get("/admin/session/:sessionId", AdminActivityController.getAdminSessionSummary);

/**
 * @route   GET /api/activity/admin/accuracy-trend
 * @desc    Get accuracy trend over time
 * @query   startDate, endDate
 * @access  Private (Admin)
 */
router.get("/admin/accuracy-trend", AdminActivityController.getAccuracyTrend);

export default router;
