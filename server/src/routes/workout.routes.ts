import { Router } from "express";
import { UserWorkoutController } from "../controllers/workout/UserWorkoutController";
import { AdminWorkoutController } from "../controllers/workout/AdminWorkoutController";

const router = Router();

// ====================================
// USER WORKOUT ROUTES
// ====================================

/**
 * @route   GET /api/workout/overview
 * @desc    Get user workout overview (summary + recent workouts)
 * @access  Private (User)
 */
router.get("/overview", UserWorkoutController.getUserWorkoutOverview);

/**
 * @route   GET /api/workout/session/:sessionId
 * @desc    Get single workout session detailed view
 * @access  Private (User)
 */
router.get("/session/:sessionId", UserWorkoutController.getWorkoutSession);

/**
 * @route   GET /api/workout/session/:sessionId/readings
 * @desc    Get workout readings for session (HR time-series data)
 * @access  Private (User)
 */
router.get("/session/:sessionId/readings", UserWorkoutController.getWorkoutReadings);

/**
 * @route   GET /api/workout/trend
 * @desc    Get workout trend data for charts
 * @access  Private (User)
 */
router.get("/trend", UserWorkoutController.getWorkoutTrend);

// ====================================
// ADMIN WORKOUT ROUTES
// ====================================

/**
 * @route   GET /api/workout/admin/global
 * @desc    Get admin global workout summary
 * @access  Private (Admin)
 */
router.get("/admin/global", AdminWorkoutController.getGlobalSummary);

/**
 * @route   GET /api/workout/admin/firmware
 * @desc    Get firmware performance for workout metric
 * @access  Private (Admin)
 */
router.get("/admin/firmware", AdminWorkoutController.getFirmwarePerformance);

/**
 * @route   GET /api/workout/admin/benchmark
 * @desc    Get benchmark comparison summary for workout
 * @access  Private (Admin)
 */
router.get("/admin/benchmark", AdminWorkoutController.getBenchmarkComparison);

/**
 * @route   GET /api/workout/admin/user/:userId
 * @desc    Get workout summary for specific user (admin view)
 * @access  Private (Admin)
 */
router.get("/admin/user/:userId", AdminWorkoutController.getUserWorkoutSummary);

/**
 * @route   GET /api/workout/admin/sessions
 * @desc    Get all workout sessions (paginated)
 * @access  Private (Admin)
 */
router.get("/admin/sessions", AdminWorkoutController.getAllWorkoutSessions);

export default router;
