import { Router } from 'express';
import {getDeviceByType, getAllDevices, getLunaFirmwareVersions, createDevice, deleteDevice } from '../controllers/device.controller';

const router = Router();

// Create or update a device
router.get('/firmware', getLunaFirmwareVersions);
// Get device by type
router.get('/:deviceType', getDeviceByType);
// Get all devices

router.get('/', getAllDevices);
router.post('/', createDevice);
router.delete('/:deviceId', deleteDevice);


export default router;
