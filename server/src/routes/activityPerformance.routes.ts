import { Router } from 'express';
import {
  getAllActivityPerformance,
  getActivityPerformance,
} from '../controllers/activityPerformance.controller';

const router = Router();

// GET all activity performance summaries
router.get('/', getAllActivityPerformance);

// GET specific activity performance
router.get('/:activityType', getActivityPerformance);

export default router;
