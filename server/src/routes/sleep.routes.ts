import { Router } from "express";
import { UserSleepController } from "../controllers/sleep/UserSleepController";
import { AdminSleepController } from "../controllers/sleep/AdminSleepController";

const router = Router();

// ====================================
// USER SLEEP ROUTES
// ====================================

/**
 * @route   GET /api/sleep/overview
 * @desc    Get user sleep overview (1A - across all sessions)
 * @access  Private (User)
 */
router.get("/overview", UserSleepController.getUserSleepOverview);

/**
 * @route   GET /api/sleep/session/:sessionId
 * @desc    Get single session detailed view (1B)
 * @access  Private (User)
 */
router.get("/session/:sessionId", UserSleepController.getSingleSessionView);

/**
 * @route   GET /api/sleep/trend
 * @desc    Get sleep trend data for charts
 * @access  Private (User)
 */
router.get("/trend", UserSleepController.getSleepTrend);

/**
 * @route   GET /api/sleep/architecture
 * @desc    Get sleep architecture distribution (for pie chart)
 * @access  Private (User)
 */
router.get("/architecture", UserSleepController.getSleepArchitecture);

/**
 * @route   GET /api/sleep/hypnogram/:sessionId
 * @desc    Get hypnogram data for a single session
 * @access  Private (User)
 */
router.get("/hypnogram/:sessionId", UserSleepController.getHypnogram);

// ====================================
// ADMIN SLEEP ROUTES
// ====================================

/**
 * @route   GET /api/sleep/admin/global-summary
 * @desc    Admin Global Summary (2A)
 * @query   latestFirmwareOnly (boolean)
 * @access  Private (Admin)
 */
router.get("/admin/global-summary", AdminSleepController.getGlobalSummary);

/**
 * @route   GET /api/sleep/admin/firmware-comparison
 * @desc    Firmware-Wise Comparison (2B)
 * @access  Private (Admin)
 */
router.get("/admin/firmware-comparison", AdminSleepController.getFirmwareComparison);

/**
 * @route   GET /api/sleep/admin/benchmark-comparison
 * @desc    Benchmark Device Comparison (2C)
 * @access  Private (Admin)
 */
router.get("/admin/benchmark-comparison", AdminSleepController.getBenchmarkComparison);

/**
 * @route   GET /api/sleep/admin/user/:userId
 * @desc    Admin User Summary (2D)
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId", AdminSleepController.getAdminUserSummary);

/**
 * @route   GET /api/sleep/admin/user/:userId/firmware-comparison
 * @desc    Get firmware comparison for specific user
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId/firmware-comparison", AdminSleepController.getUserFirmwareComparison);

/**
 * @route   GET /api/sleep/admin/user/:userId/benchmark-comparison
 * @desc    Get benchmark comparison for specific user
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId/benchmark-comparison", AdminSleepController.getUserBenchmarkComparison);

/**
 * @route   GET /api/sleep/admin/session/:sessionId
 * @desc    Admin Session Level Summary (2E - most technical)
 * @access  Private (Admin)
 */
router.get("/admin/session/:sessionId", AdminSleepController.getAdminSessionSummary);

/**
 * @route   GET /api/sleep/admin/accuracy-trend
 * @desc    Get accuracy trend over time
 * @query   startDate, endDate
 * @access  Private (Admin)
 */
router.get("/admin/accuracy-trend", AdminSleepController.getAccuracyTrend);

/**
 * @route   GET /api/sleep/admin/hypnogram/:sessionId
 * @desc    Get hypnogram data for admin view (dual overlay)
 * @access  Private (Admin)
 */
router.get("/admin/hypnogram/:sessionId", AdminSleepController.getAdminHypnogram);

export default router;
