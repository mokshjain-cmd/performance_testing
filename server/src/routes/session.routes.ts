
import { Router } from 'express';
import { createSession, getSession, getAllSessions, deleteSession, getSessionsByUserId, getSessionIdsByUserId } from '../controllers/session.controller';
import { getSessionFullDetails } from '../controllers/sessionDetails.controller';
import { uploadDeviceFiles } from '../middleware/upload.middleware';
// Get full session details, analysis, and points for plotting


const router = Router();

// Create a new session with device files
router.post('/create', uploadDeviceFiles, createSession);
router.get('/by-user', getSessionsByUserId);
router.get('/full/:id', getSessionFullDetails);
// Get session by ID
router.get('/:id', getSession);

// Get all sessions

router.get('/all/:userId', getAllSessions);
router.get('/allid/:userId', getSessionIdsByUserId);



// Delete session by ID
router.delete('/:id', deleteSession);

export default router;
