import { Router } from 'express';
import { createUser, getAllUsers, getUserByEmail } from '../controllers/user.controller';
import { getUserOverallSummary } from '../controllers/userSummary.controller';
import { get } from 'http';
import { requireRole, verifyUserRole } from '../middleware';

const router = Router();


// POST /api/users/create

//router.post('/create', createUser);

// GET /api/users/by-email?email=foo@bar.com
router.get('/by-email', requireRole('admin'),getUserByEmail);

// GET /api/users/summary - Get current user's summary (from JWT)
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps (defaults to HR)
router.get('/summary', getUserOverallSummary);

// GET /api/users/summary/:userId - Admin can view any user's summary
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps (defaults to HR)
router.get('/summary/:userId', requireRole('admin'), getUserOverallSummary);

router.get('/',requireRole('admin'),getAllUsers);

export default router;
