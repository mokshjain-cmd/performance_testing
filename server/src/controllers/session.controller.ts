import { Request, Response } from 'express';
import Session from '../models/Session';
import Device from '../models/Devices';
import { ingestSessionFiles } from '../services/sessionIngestion.service';

/**
 * Create a new session with device files
 * Expects multipart/form-data with:
 * - userId, activityType, startTime, endTime
 * - benchmarkDeviceType (optional)
 * - deviceFiles[] - array of raw files (fieldname should be deviceType)
 */

//currently no user check , add later
export const createSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      userId,
      activityType,
      startTime,
      endTime,
      benchmarkDeviceType
    } = req.body;

    if (!userId || !activityType || !startTime || !endTime) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: userId, activityType, startTime, endTime"
      });
      return;
    }

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    const durationSec = Math.floor(
      (end.getTime() - start.getTime()) / 1000
    );

    // Resolve deviceId from DB for each uploaded file
    const devices = await Promise.all(
      files.map(async (file) => {
        const deviceType = file.fieldname;

        const device = await Device.findOne({ deviceType });

        if (!device) {
          throw new Error(`Device not registered: ${deviceType}`);
        }

        return {
          deviceId: device._id,
          deviceType: device.deviceType,
          firmwareVersion: device.firmwareVersion
        };
      })
    );

    // Create session
    const session = await Session.create({
      userId,
      activityType,
      startTime: start,
      endTime: end,
      durationSec,
      devices,
      benchmarkDeviceType
    });

    ingestSessionFiles({
        sessionId: session._id,
        userId,
        startTime: start,
        endTime: end,
        files,
    });

    
    res.status(201).json({
      success: true,
      data: session
    });



  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get session by ID
 */
export const getSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate('userId', 'email name')
      .populate('devices.deviceId')
      .exec();

    if (!session) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get all sessions
 */
export const getAllSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessions = await Session.find()
      .populate('userId', 'email name')
      .populate('devices.deviceId')
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sessions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete session
 */
export const deleteSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await Session.findByIdAndDelete(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
