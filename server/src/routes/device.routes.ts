import { Router } from 'express';
import { createOrUpdateDevice, getDeviceByType, getAllDevices } from '../controllers/device.controller';

const router = Router();

// Create or update a device

// Get device by type
router.get('/:deviceType', getDeviceByType);
// Get all devices
router.get('/', getAllDevices);
router.post('/', createOrUpdateDevice);


export default router;
