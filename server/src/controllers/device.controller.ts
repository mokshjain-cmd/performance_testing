import { Request, Response } from 'express';
import Device from '../models/Devices';

/**
 * Create or update a device
 */
export const createOrUpdateDevice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const deviceData = req.body;

    if (!deviceData.deviceType) {
      res.status(400).json({
        success: false,
        message: 'Device type is required'
      });
      return;
    }

    // Check if device already exists
    const existingDevice = await Device.findOne({ 
      deviceType: deviceData.deviceType
    });

    let device;
    if (existingDevice) {
      // Update existing device
      Object.assign(existingDevice, deviceData);
      device = await existingDevice.save();
    } else {
      // Create new device
      device = await Device.create(deviceData);
    }

    res.status(201).json({
      success: true,
      message: 'Device saved successfully',
      data: device
    });
  } catch (error) {
    console.error('Error saving device:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save device',
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
