import { Router } from 'express';
import {
  getAllFirmwarePerformance,
  getFirmwarePerformance,
} from '../controllers/firmwarePerformance.controller';

const router = Router();

// GET all firmware performance data
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps (defaults to HR)
router.get('/', getAllFirmwarePerformance);

// GET specific firmware version performance
// Optional query param: ?metric=HR|SPO2|Sleep|Calories|Steps (defaults to HR)
router.get('/:version', getFirmwarePerformance);

export default router;
