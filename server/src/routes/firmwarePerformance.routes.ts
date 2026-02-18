import { Router } from 'express';
import {
  getAllFirmwarePerformance,
  getFirmwarePerformance,
} from '../controllers/firmwarePerformance.controller';

const router = Router();

// GET all firmware performance data
router.get('/', getAllFirmwarePerformance);

// GET specific firmware version performance
router.get('/:version', getFirmwarePerformance);

export default router;
