import { Router } from 'express';
import {
  getAdminDailyTrends,
  getAdminDailyTrendByDate,
} from '../controllers/adminDailyTrend.controller';

// Uncomment the following line to enable role-based access control
// import { verifyUserRole, requireAdmin } from '../middleware';

const router = Router();

// GET all daily trends (with optional startDate query param)
// Example: /api/admin/daily-trends?startDate=2024-01-01
// Add verifyUserRole and requireAdmin middleware to restrict access:
// router.get('/', verifyUserRole, requireAdmin, getAdminDailyTrends);
router.get('/', getAdminDailyTrends);

// GET daily trend for a specific date
// Example: /api/admin/daily-trends/2024-01-15
// router.get('/:date', verifyUserRole, requireAdmin, getAdminDailyTrendByDate);
router.get('/:date', getAdminDailyTrendByDate);

export default router;
