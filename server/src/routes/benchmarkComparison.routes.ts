import { Router } from 'express';
import {
  getAllBenchmarkComparisons,
  getBenchmarkComparison,
} from '../controllers/benchmarkComparison.controller';

const router = Router();

// GET all benchmark comparison summaries
// Optional query param: ?metric=HR|SPO2|Sleep|Activity (defaults to HR)
router.get('/', getAllBenchmarkComparisons);

// GET specific benchmark device comparison
// Optional query param: ?metric=HR|SPO2|Sleep|Activity (defaults to HR)
router.get('/:deviceType', getBenchmarkComparison);

export default router;
