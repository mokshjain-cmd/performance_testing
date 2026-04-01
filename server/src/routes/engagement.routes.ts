import { Router } from 'express';
import { engagementController } from '../controllers/engagementController';
import { authenticateJWT, requireRole } from '../middleware/auth.middleware';
import multer from 'multer';
import path from 'path';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../temp/engagement-logs'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit per file
  }
});

// ============ PUBLIC ROUTES (No Auth Required) ============
// Upload logs endpoint (for app team to upload logs automatically)
router.post('/upload-logs', upload.any(), engagementController.uploadLogs.bind(engagementController));

// ============ PROTECTED ROUTES (Admin Only) ============
// Get engagement statistics (overview)
router.get('/stats', authenticateJWT, requireRole('admin'), engagementController.getEngagementStats.bind(engagementController));

// Get inactive users (for device reclaim)
router.get('/inactive-users', authenticateJWT, requireRole('admin'), engagementController.getInactiveUsers.bind(engagementController));

// ============ NEW OPTIMIZED ENDPOINTS FOR UI ============

// Get users list (optimized - userId, name, email, status, lastActive)
router.get('/users/list', authenticateJWT, requireRole('admin'), engagementController.getUsersList.bind(engagementController));

// Get all users engagement overview (detailed)
router.get('/users', authenticateJWT, requireRole('admin'), engagementController.getAllUsersEngagement.bind(engagementController));

// Get user overview with all dates
router.get('/users/:userId/overview', authenticateJWT, requireRole('admin'), engagementController.getUserOverview.bind(engagementController));

// Get detailed metrics for specific date
router.get('/users/:userId/date/:date', authenticateJWT, requireRole('admin'), engagementController.getUserDateMetrics.bind(engagementController));

// Get metrics for date range
router.get('/users/:userId/range', authenticateJWT, requireRole('admin'), engagementController.getMetricsDateRange.bind(engagementController));

// Get specific user engagement (legacy - backward compatible)
router.get('/users/:userId', authenticateJWT, requireRole('admin'), engagementController.getUserEngagement.bind(engagementController));

// Get user metrics (filtered by date range and metric type) - legacy
router.get('/users/:userId/metrics', authenticateJWT, requireRole('admin'), engagementController.getUserMetrics.bind(engagementController));

export default router;
