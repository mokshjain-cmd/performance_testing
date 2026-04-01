
import { Router } from 'express';
import healthRoutes from './health.routes';
import sessionRoutes from './session.routes';
import sleepRoutes from './sleep.routes';
import activityRoutes from './activity.routes';
import deviceRoutes from './device.routes';
import userRoutes from './user.routes';
import activityPerformanceRoutes from './activityPerformance.routes';
import benchmarkComparisonRoutes from './benchmarkComparison.routes';
import adminDailyTrendRoutes from './adminDailyTrend.routes';
import adminGlobalSummaryRoutes from './adminGlobalSummary.routes';
import firmwarePerformanceRoutes from './firmwarePerformance.routes';
import firmwareConfigRoutes from './firmwareConfig.routes';
import cronRoutes from './cron.routes';
import authRoutes from './auth.routes';
import engagementRoutes from './engagement.routes';
import { authenticateJWT, requireRole, verifyUserRole } from '../middleware/auth.middleware';

const router = Router();


// Public routes (no authentication required)
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/engagement', engagementRoutes); // Public - for app team log uploads

// Protected routes (authentication required)
router.use('/sessions', authenticateJWT, sessionRoutes);
router.use('/sleep', authenticateJWT, sleepRoutes);
router.use('/activity', authenticateJWT, activityRoutes);
router.use('/devices', authenticateJWT, deviceRoutes);
router.use('/users', authenticateJWT, userRoutes);
router.use('/activity-performance', authenticateJWT, requireRole('admin'),activityPerformanceRoutes);
router.use('/benchmark-comparisons', authenticateJWT, requireRole('admin'),benchmarkComparisonRoutes);
router.use('/admin/daily-trends', authenticateJWT, requireRole('admin'), adminDailyTrendRoutes);
router.use('/admin/global-summary', authenticateJWT, requireRole('admin'), adminGlobalSummaryRoutes);
router.use('/firmware-performance', authenticateJWT, requireRole('admin'), firmwarePerformanceRoutes);
router.use('/firmware-config', authenticateJWT, requireRole('admin'), firmwareConfigRoutes);
router.use('/cron', authenticateJWT, requireRole('admin'),   cronRoutes);

export default router;
