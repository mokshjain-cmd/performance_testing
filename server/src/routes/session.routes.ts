import { Router } from 'express';
import { createSession, getSession, getAllSessions, deleteSession } from '../controllers/session.controller';
import { uploadDeviceFiles } from '../middleware/upload.middleware';

const router = Router();

// Create a new session with device files
router.post('/create', uploadDeviceFiles, createSession);

// Get all sessions
router.get('/', getAllSessions);

// Get session by ID
router.get('/:id', getSession);

// Delete session by ID
router.delete('/:id', deleteSession);

export default router;
