import { Request, Response } from 'express';
import Device from '../models/Devices';

/**
 * Create or update a device
 */



export const createDevice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deviceData = req.body;

    const { deviceType, firmwareVersion } = deviceData;

    if (!deviceType || !firmwareVersion) {
      res.status(400).json({
        success: false,
        message: 'Device type and firmware version are required'
      });
      return;
    }

    // Check if same deviceType + firmwareVersion already exists
    const existingDevice = await Device.findOne({
      deviceType,
      firmwareVersion
    });

    if (existingDevice) {
      res.status(409).json({
        success: false,
        message: 'Device with same type and firmware version already exists'
      });
      return;
    }
    console.log('Creating device with data:', deviceData);
    // Create new device
    const device = await Device.create(deviceData);
    console.log('Device created:', device);
    res.status(201).json({
      success: true,
      message: 'Device created successfully',
      data: device
    });

  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create device',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const deleteDevice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const device = await Device.findByIdAndDelete(id);

    if (!device) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete device',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get device by type
 */
export const getDeviceByType = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { deviceType } = req.params;

    const device = await Device.findOne({ deviceType }).exec();

    if (!device) {
      res.status(404).json({
        success: false,
        message: 'Device not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: device
    });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all devices
 */
export const getAllDevices = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const devices = await Device.find()
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch devices',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getLunaFirmwareVersions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const firmwareVersions = await Device.distinct('firmwareVersion', {
      deviceType: 'luna'
    });

    res.status(200).json({
      success: true,
      deviceType: 'luna',
      count: firmwareVersions.length,
      data: firmwareVersions
    });

  } catch (error) {
    console.error('Error fetching Luna firmware versions:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch Luna firmware versions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
