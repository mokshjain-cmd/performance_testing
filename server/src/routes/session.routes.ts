
import { Router } from 'express';
import { createSession, getSession,createManualSleepSession, getAllSessions, deleteSession, getSessionsByUserId, getSessionIdsByUserId, getSessionIdsByUserIdParam, createManualActivitySession } from '../controllers/session.controller';
import { getSessionFullDetails } from '../controllers/sessionDetails.controller';
import { uploadDeviceFiles } from '../middleware/upload.middleware';
import { requireRole } from '../middleware';
import { uploadChunkMiddleware } from '../middleware/uploadchunk.middleware';
import { uploadChunk, cleanupUploadedFiles, uploadSingle } from '../controllers/upload.controller';
// Get full session details, analysis, and points for plotting


const router = Router();

// Create a new session with device files
router.post(
  '/upload-chunk',
  requireRole(['admin', 'tester']),
  (req, res, next) => {
    console.log('Received chunk upload request');
    uploadChunkMiddleware.single('chunk')(req, res, (err: any) => {
      if (err) {
        console.error('❌ multer upload-chunk error:', err);
        return res.status(400).json({
          success: false,
          message: err.message,
          code: err.code,
        });
      }
      next();
    });
  },
  uploadChunk
);
router.post('/cleanup-upload', requireRole(['admin','tester']), cleanupUploadedFiles);
router.post(
  '/upload-single',
  requireRole(['admin','tester']),
  uploadDeviceFiles,
  uploadSingle
);
router.post('/create', requireRole(['admin','tester']),uploadDeviceFiles, createSession);
router.post('/create-manual-sleep', requireRole(['admin','tester']), createManualSleepSession);
router.post('/create-manual-activity', requireRole(['admin','tester']), createManualActivitySession);
// Get current user's sessions (from JWT)
// Optional query param: ?metric=HR|SPO2|Sleep|Activity
router.get('/all', requireRole(['admin','tester']),getAllSessions);
router.get('/ids', requireRole(['admin','tester']),getSessionIdsByUserId);
// Optional query param: ?metric=HR|SPO2|Sleep|Activity
router.get('/by-user',requireRole(['admin','tester']), getSessionsByUserId);

// Admin-only: Get any user's sessions by userId param
// Optional query param: ?metric=HR|SPO2|Sleep|Activity
router.get('/user/:userId/ids', requireRole('admin'), getSessionIdsByUserIdParam);

// Get session by ID
router.get('/full/:id', requireRole(['admin','tester']),getSessionFullDetails);
router.get('/:id',requireRole(['admin','tester']), getSession);



// Delete session by ID
router.delete('/:id', requireRole(['admin']),deleteSession);

export default router;
