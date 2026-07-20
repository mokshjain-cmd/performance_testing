import { Router } from 'express';
import { fitnessAgeController } from '../controllers/fitnessAge.controller';
import { requireRole } from '../middleware/auth.middleware';

const router = Router();

// Any authenticated user — their own Fitness Age (or a "not linked" state)
router.get('/me', fitnessAgeController.getMyFitnessAge.bind(fitnessAgeController));

// Admin only — everyone we have a Fitness Age snapshot for
router.get(
  '/admin/users',
  requireRole('admin'),
  fitnessAgeController.getAdminUsersList.bind(fitnessAgeController)
);
router.get(
  '/admin/users/:fitnessAppUserId',
  requireRole('admin'),
  fitnessAgeController.getAdminUserDetail.bind(fitnessAgeController)
);

export default router;
