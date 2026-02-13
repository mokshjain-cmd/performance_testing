import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { uploadDeviceFiles } from '../middleware/upload.middleware';

const router = Router();
const sessionController = new SessionController();

// Create a new session with device files
router.post('/create', uploadDeviceFiles, sessionController.createSession);

// Get all sessions
router.get('/', sessionController.getAllSessions);

// Get session by ID
router.get('/:id', sessionController.getSession);

// Delete session by ID
router.delete('/:id', sessionController.deleteSession);

export default router;
