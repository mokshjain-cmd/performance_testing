import { Router } from 'express';
import {
  getAllBenchmarkComparisons,
  getBenchmarkComparison,
} from '../controllers/benchmarkComparison.controller';

const router = Router();

// GET all benchmark comparison summaries
router.get('/', getAllBenchmarkComparisons);

// GET specific benchmark device comparison
router.get('/:deviceType', getBenchmarkComparison);

export default router;
