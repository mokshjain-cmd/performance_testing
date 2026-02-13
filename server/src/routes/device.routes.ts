import { Router } from 'express';
import { createOrUpdateDevice, getDeviceByType, getAllDevices } from '../controllers/device.controller';

const router = Router();

// Create or update a device
router.post('/', createOrUpdateDevice);

// Get all devices
router.get('/', getAllDevices);

// Get device by type
router.get('/:deviceType', getDeviceByType);

export default router;
