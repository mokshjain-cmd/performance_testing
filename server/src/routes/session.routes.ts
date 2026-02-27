
import { Router } from 'express';
import { createSession, getSession, getAllSessions, deleteSession, getSessionsByUserId, getSessionIdsByUserId, getSessionIdsByUserIdParam } from '../controllers/session.controller';
import { getSessionFullDetails } from '../controllers/sessionDetails.controller';
import { uploadDeviceFiles } from '../middleware/upload.middleware';
import { requireRole } from '../middleware';
// Get full session details, analysis, and points for plotting


const router = Router();

// Create a new session with device files
router.post('/create', requireRole(['admin','tester']),uploadDeviceFiles, createSession);

// Get current user's sessions (from JWT)
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps
router.get('/all', requireRole(['admin','tester']),getAllSessions);
router.get('/ids', requireRole(['admin','tester']),getSessionIdsByUserId);
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps
router.get('/by-user',requireRole(['admin','tester']), getSessionsByUserId);

// Admin-only: Get any user's sessions by userId param
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps
router.get('/user/:userId/ids', requireRole('admin'), getSessionIdsByUserIdParam);

// Get session by ID
router.get('/full/:id', requireRole(['admin','tester']),getSessionFullDetails);
router.get('/:id',requireRole(['admin','tester']), getSession);



// Delete session by ID
router.delete('/:id', requireRole(['admin']),deleteSession);

export default router;
