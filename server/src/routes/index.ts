import { Router } from 'express';
import healthRoutes from './health.routes';
import sessionRoutes from './session.routes';
import deviceRoutes from './device.routes';

const router = Router();

// Register all routes here
router.use('/health', healthRoutes);
router.use('/sessions', sessionRoutes);
router.use('/devices', deviceRoutes);

export default router;
