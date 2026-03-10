import { Router } from 'express';
import { 
  getAllFirmwareConfigs, 
  getFirmwareConfigByMetric,
  updateFirmwareConfig 
} from '../controllers/firmwareConfig.controller';

const router = Router();

/**
 * GET /api/firmware-config
 * Get all firmware configurations
 */
router.get('/', getAllFirmwareConfigs);

/**
 * GET /api/firmware-config/:metric
 * Get firmware configuration for specific metric
 * @param metric - HR, SPO2, Sleep, or Activity
 */
router.get('/:metric', getFirmwareConfigByMetric);

/**
 * PUT /api/firmware-config/:metric
 * Update firmware configuration for specific metric
 * @param metric - HR, SPO2, Sleep, or Activity
 * @body latestFirmwareVersion - The latest firmware version string
 * @body description - Optional description of changes
 */
router.put('/:metric', updateFirmwareConfig);

export default router;
