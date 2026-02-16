import { Router } from 'express';
import { createUser, getUserByEmail } from '../controllers/user.controller';

const router = Router();

// POST /api/users/create
router.post('/create', createUser);

// GET /api/users/by-email?email=foo@bar.com
router.get('/by-email', getUserByEmail);

export default router;
