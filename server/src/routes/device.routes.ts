import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';

const router = Router();
const deviceController = new DeviceController();

// Create or update a device
router.post('/', deviceController.createOrUpdateDevice);

// Get device by type
router.get('/:deviceType', deviceController.getDeviceByType);

export default router;
