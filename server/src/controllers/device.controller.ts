import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';

export class DeviceController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Create or update a device
   */
  public createOrUpdateDevice = async (
    req: Request,
    res: Response,
    next: NextFunction
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

      const device = await this.sessionService.createOrUpdateDevice(deviceData);

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
  public getDeviceByType = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { deviceType } = req.params;

      const device = await this.sessionService.getDeviceByType(deviceType);

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
}
