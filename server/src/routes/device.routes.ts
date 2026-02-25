import { Router } from 'express';
import {getDeviceByType, getAllDevices, getLunaFirmwareVersions, createDevice, deleteDevice } from '../controllers/device.controller';
import { requireRole } from '../middleware';

const router = Router();

// Create or update a device
router.get('/firmware', requireRole(['tester','admin']), getLunaFirmwareVersions);
// Get device by type
router.get('/:deviceType', getDeviceByType);
// Get all devices

router.get('/', getAllDevices);
router.post('/', requireRole('admin'),createDevice);
router.delete('/:deviceId', requireRole('admin'),deleteDevice);


export default router;
