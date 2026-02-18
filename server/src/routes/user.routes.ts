import { Router } from 'express';
import { createUser, getAllUsers, getUserByEmail } from '../controllers/user.controller';
import { getUserOverallSummary } from '../controllers/userSummary.controller';
import { get } from 'http';
import { requireRole, verifyUserRole } from '../middleware';

const router = Router();


// POST /api/users/create

router.post('/create', createUser);

// GET /api/users/by-email?email=foo@bar.com
router.get('/by-email', getUserByEmail);

// GET /api/users/summary/:userId
router.get('/summary/:userId', getUserOverallSummary);

router.get('/',getAllUsers);

export default router;
