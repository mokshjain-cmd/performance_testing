import { Request, Response } from 'express';
import FirmwareConfig from '../models/FirmwareConfig';

/**
 * Get all firmware configurations
 */
export const getAllFirmwareConfigs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const configs = await FirmwareConfig.find().sort({ metric: 1 });

    res.status(200).json({
      success: true,
      data: configs,
    });
  } catch (error) {
    console.error('Error fetching firmware configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch firmware configurations',
    });
  }
};

/**
 * Get firmware configuration for a specific metric
 */
export const getFirmwareConfigByMetric = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { metric } = req.params;
    
    const config = await FirmwareConfig.findOne({ metric });

    if (!config) {
      res.status(404).json({
        success: false,
        message: `No firmware configuration found for metric: ${metric}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching firmware config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch firmware configuration',
    });
  }
};

/**
 * Update or create firmware configuration for a metric
 */
export const updateFirmwareConfig = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { metric } = req.params;
    const { latestFirmwareVersion, description } = req.body;

    if (!latestFirmwareVersion) {
      res.status(400).json({
        success: false,
        message: 'latestFirmwareVersion is required',
      });
      return;
    }

    // Get admin user from JWT (if available)
    const updatedBy = (req as any).user?.email || 'admin';

    const config = await FirmwareConfig.findOneAndUpdate(
      { metric },
      {
        latestFirmwareVersion,
        description,
        updatedAt: new Date(),
        updatedBy,
      },
      { 
        new: true, 
        upsert: true, // Create if doesn't exist
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: config,
      message: `Firmware configuration for ${metric} updated successfully`,
    });
  } catch (error) {
    console.error('Error updating firmware config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update firmware configuration',
    });
  }
};

/**
 * Helper function to get latest firmware version for a metric
 * Returns null if not configured
 */
export const getLatestFirmwareVersion = async (
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity'
): Promise<string | null> => {
  try {
    const config = await FirmwareConfig.findOne({ metric });
    return config?.latestFirmwareVersion || null;
  } catch (error) {
    console.error(`Error fetching latest firmware for ${metric}:`, error);
    return null;
  }
};
