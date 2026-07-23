import { Router } from 'express';
import { UserHrvController } from '../controllers/hrv/UserHrvController';
import { AdminHrvController } from '../controllers/hrv/AdminHrvController';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// ====================================
// USER HRV ROUTES
// ====================================
router.get('/overview', UserHrvController.getUserHrvOverview);
router.get('/trend', UserHrvController.getHrvTrend);
router.get('/session/:sessionId', UserHrvController.getHrvSession);
router.get('/session/:sessionId/readings', UserHrvController.getHrvReadings);

// ====================================
// ADMIN HRV ROUTES
// ====================================
router.get('/admin/global', requireRole('admin'), AdminHrvController.getGlobalSummary);
router.get('/admin/daily-trend', requireRole('admin'), AdminHrvController.getDailyTrend);
router.get('/admin/firmware', requireRole('admin'), AdminHrvController.getFirmwarePerformance);
router.get('/admin/benchmark', requireRole('admin'), AdminHrvController.getBenchmarkComparison);
router.get('/admin/user/:userId', requireRole('admin'), AdminHrvController.getUserHrvSummary);
router.get('/admin/user/:userId/trend', requireRole('admin'), AdminHrvController.getUserHrvTrend);
router.get('/admin/sessions', requireRole('admin'), AdminHrvController.getAllHrvSessions);

export default router;
