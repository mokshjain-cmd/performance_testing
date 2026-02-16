import { Router } from 'express';
import { createUser, getUserByEmail } from '../controllers/user.controller';
import { getUserOverallSummary } from '../controllers/userSummary.controller';

const router = Router();


// POST /api/users/create
router.post('/create', createUser);

// GET /api/users/by-email?email=foo@bar.com
router.get('/by-email', getUserByEmail);

// GET /api/users/summary/:userId
router.get('/summary/:userId', getUserOverallSummary);

export default router;
