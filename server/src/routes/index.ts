
import { Router } from 'express';
import healthRoutes from './health.routes';
import sessionRoutes from './session.routes';
import deviceRoutes from './device.routes';
import userRoutes from './user.routes';
import activityPerformanceRoutes from './activityPerformance.routes';
import benchmarkComparisonRoutes from './benchmarkComparison.routes';
import adminDailyTrendRoutes from './adminDailyTrend.routes';
import adminGlobalSummaryRoutes from './adminGlobalSummary.routes';
import firmwarePerformanceRoutes from './firmwarePerformance.routes';

const router = Router();


// Register all routes here
router.use('/health', healthRoutes);
router.use('/sessions', sessionRoutes);
router.use('/devices', deviceRoutes);
router.use('/users', userRoutes);
router.use('/activity-performance', activityPerformanceRoutes);
router.use('/benchmark-comparisons', benchmarkComparisonRoutes);
router.use('/admin/daily-trends', adminDailyTrendRoutes);
router.use('/admin/global-summary', adminGlobalSummaryRoutes);
router.use('/firmware-performance', firmwarePerformanceRoutes);

export default router;
