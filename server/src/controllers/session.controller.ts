
import { Request, Response } from 'express';
import Session from '../models/Session';
import Device from '../models/Devices';
import mongoose from "mongoose";
import { ingestSessionFiles } from '../services/sessionIngestion.service';
import { deleteSession as deleteSessionService } from '../services/sessionDeletion.service';

/**
 * Create a new session with device files
 * Expects multipart/form-data with:
 * - userId, activityType, startTime, endTime
 * - benchmarkDeviceType (optional)
 * - deviceFiles[] - array of raw files (fieldname should be deviceType)
 */


function parseISTString(dateStr: string): Date {
  // Expecting: "2026-02-13T15:20:50"
  const [datePart, timePart] = dateStr.split("T");

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  // Create date as IST but store correct UTC equivalent
  // IST = UTC + 5:30 → so subtract 5:30 to get UTC
  return new Date(Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second
  ));
}



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
      benchmarkDeviceType,
      bandPosition
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

    const start = parseISTString(startTime);
    const end = parseISTString(endTime);  
    console.log('Parsed start time (UTC):', start.toISOString());
    console.log('Parsed end time (UTC):', end.toISOString());
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
      benchmarkDeviceType,
      bandPosition,
    });

    ingestSessionFiles({
        sessionId: session._id,
        userId,
        activityType,
        bandPosition,
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
 * Get all sessions for a user
 */
export const getSessionsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }
    const sessions = await Session.find({ userId })
      .populate('userId', 'email name')
      .populate('devices.deviceId')
      .sort({ createdAt: -1 })
      .exec();
    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch sessions', error: error instanceof Error ? error.message : 'Unknown error' });
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
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid userId"
      });
      return;
    }

    const sessions = await Session.find({ userId })
      .populate("userId", "email name")
      .sort({ createdAt: -1 })
      .exec();

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Delete session and recalculate summaries
 */
export const deleteSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid session ID'
      });
      return;
    }

    // Delete session and recalculate summaries
    const result = await deleteSessionService(id);

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    
    // Handle "Session not found" error
    if (error instanceof Error && error.message === 'Session not found') {
      res.status(404).json({
        success: false,
        message: 'Session not found'
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete session',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};



