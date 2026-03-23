import { Request, Response } from 'express';
import Session from '../models/Session';
import Device from '../models/Devices';
import mongoose from "mongoose";
import { ingestSessionFiles } from '../services/sessionIngestion.service';
import { ingestSPO2SessionFiles } from '../services/ingestSPO2Session.service';
import { IngestSleepService } from '../services/sleep/IngestSleepService';
import { SleepAnalysisService } from '../services/sleep/SleepAnalysisService';
import { IngestActivityService } from '../services/activity/IngestActivityService';
import { ActivityAnalysisService } from '../services/activity/ActivityAnalysisService';
import { ActivitySummaryService } from '../services/activity/ActivitySummaryService';
import { deleteSession as deleteSessionService } from '../services/sessionDeletion.service';
import storageService from '../services/storage.service';
import { updateAdminGlobalSummary } from '../services/adminGlobalSummary.service';
import { updateFirmwarePerformanceForLuna } from '../services/firmwarePerformance.service';
import { updateBenchmarkComparisonSummariesForSession } from '../services/benchmarkComparisonSummary.service';
import { updateAdminDailyTrend } from '../services/adminDailyTrend.service';

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
    const userId = req.userId; 
    const {
      sessionName,
      activityType,
      metric,
      startTime,
      endTime,
      sleepDate, // For sleep sessions: user provides just the date, we calculate the range
      activityDate, // For activity sessions: user provides just the date, we calculate the range
      dailyDate, // For HR/SPO2 daily sessions: user provides just the date, we calculate the range
      benchmarkDeviceType,
      bandPosition,
      firmwareVersion,
      mobileType // For Sleep/Activity with Luna: Android or iOS
    } = req.body;

    // For Activity metric, activityType is optional (tracks daily totals)
    // For other metrics, activityType is required
    if (!userId || !metric) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: userId, metric"
      });
      return;
    }

    if (metric !== 'Activity' && !activityType) {
      res.status(400).json({
        success: false,
        message: "activityType is required for non-Activity sessions"
      });
      return;
    }

    // Validate metric value
    const validMetrics = ['HR', 'SPO2', 'Sleep', 'Activity'];
    if (!validMetrics.includes(metric)) {
      res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`
      });
      return;
    }

    // For Sleep sessions, handle date differently
    let start: Date;
    let end: Date;
    
    if (metric === 'Sleep') {
      if (!sleepDate) {
        res.status(400).json({
          success: false,
          message: "sleepDate is required for Sleep sessions (format: YYYY-MM-DD)"
        });
        return;
      }

      // Parse the sleep date (e.g., "2026-03-03")
      const [year, month, day] = sleepDate.split("-").map(Number);
      
      // Start time: Previous day at 21:00 (9 PM)
      start = new Date(Date.UTC(year, month - 1, day - 1, 21, 0, 0));
      
      // End time: Given date at 09:00 (9 AM)
      end = new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
    } else if (metric === 'Activity') {
      if (!activityDate) {
        res.status(400).json({
          success: false,
          message: "activityDate is required for Activity sessions (format: YYYY-MM-DD)"
        });
        return;
      }

      // Parse the activity date (e.g., "2026-03-09")
      const [year, month, day] = activityDate.split("-").map(Number);
      
      // Start time: Activity day at 00:00 (midnight)
      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      
      // End time: Activity day at 23:59:59
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    } else if ((metric === 'HR' || metric === 'SPO2') && activityType === 'daily' && dailyDate) {
      // For HR/SPO2 daily monitoring sessions
      // Parse the daily date (e.g., "2026-03-09")
      const [year, month, day] = dailyDate.split("-").map(Number);
      
      // Start time: Daily monitoring day at 00:00 (midnight)
      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      
      // End time: Daily monitoring day at 23:59:59
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
    } else {
      // For other metrics, require explicit startTime and endTime
      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: "Missing required fields: startTime, endTime"
        });
        return;
      }
      
      start = parseISTString(startTime);
      end = parseISTString(endTime);
    }

    // Validate firmwareVersion is provided (required for Luna)
    if (!firmwareVersion) {
      res.status(400).json({
        success: false,
        message: "firmwareVersion is required"
      });
      return;
    }

    console.log(`\n📝 ========================================`);
    console.log(`📝 Creating new session:`);
    console.log(`📝    - Metric: ${metric}`);
    console.log(`📝    - Activity: ${activityType}`);
    console.log(`📝    - Firmware Version (from request): "${firmwareVersion}"`);
    console.log(`📝 ========================================\n`);

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
      return;
    }

    const durationSec = Math.floor(
      (end.getTime() - start.getTime()) / 1000
    );

    // Resolve deviceId from DB for each uploaded file
    const devices = await Promise.all(
      files.map(async (file) => {
        const deviceType = file.fieldname;

        // For Luna devices, search by both deviceType and firmwareVersion
        // For other devices, search by deviceType only
        let device;
        if (deviceType === 'luna') {
          device = await Device.findOne({ 
            deviceType, 
            firmwareVersion 
          });
          
          if (!device) {
            throw new Error(`Luna device with firmware version ${firmwareVersion} not found. Please ensure this firmware version is registered.`);
          }
          
          // Use the firmwareVersion from request, not from device lookup
          return {
            deviceId: device._id,
            deviceType: device.deviceType,
            firmwareVersion: firmwareVersion  // Use request value
          };
        } else {
          device = await Device.findOne({ deviceType });
          
          if (!device) {
            throw new Error(`Device not registered: ${deviceType}`);
          }
          
          return {
            deviceId: device._id,
            deviceType: device.deviceType,
            firmwareVersion: device.firmwareVersion
          };
        }
      })
    );

    // Create session
    const session = await Session.create({
      userId,
      name: sessionName,
      activityType,
      metric,
      startTime: start,
      endTime: end,
      durationSec,
      devices,
      benchmarkDeviceType,
      bandPosition,
    });

    console.log(`\n✅ ========================================`);
    console.log(`✅ Session created successfully!`);
    console.log(`✅    - Session ID: ${session._id}`);
    console.log(`✅    - Metric: ${metric}`);
    console.log(`✅    - Devices stored in session:`);
    devices.forEach((d) => {
      console.log(`✅       * ${d.deviceType}: firmware="${d.firmwareVersion}"`);
    });
    console.log(`✅ ========================================\n`);

    // Upload files to Google Cloud Storage and get download URLs
    console.log(`📤 Uploading files to GCS for session ${session._id}`);
    let rawFiles: Record<string, string> = {};
    if(process.env.ENV==='production') {
      try {
      rawFiles = await storageService.uploadDeviceFiles(files, session._id.toString());
      
      // Update session with raw file URLs
      session.rawFiles = rawFiles;
      await session.save();
      
      console.log(`✅ Raw files uploaded for session ${session._id}`);
    } catch (uploadError) {
      console.error('❌ Error uploading files to GCS:', uploadError instanceof Error ? uploadError.message : uploadError);
      // Continue with session creation even if upload fails
      // Files are still available locally for processing
    }
    }
    

    // Call appropriate ingestion service based on metric
    if (metric === 'SPO2') {
      ingestSPO2SessionFiles({
        sessionId: session._id,
        userId,
        activityType,
        bandPosition,
        startTime: start,
        endTime: end,
        files,
        mobileType,
      });
    } else if (metric === 'HR') {
      // Default to HR ingestion for HR and other metrics
      ingestSessionFiles({
        sessionId: session._id,
        userId,
        activityType,
        bandPosition,
        startTime: start,
        endTime: end,
        files,
        mobileType,
      });
    } else if (metric === 'Sleep') {
      // Call sleep ingestion service
      IngestSleepService.ingestSleepSession(session._id, userId, files, benchmarkDeviceType, mobileType).then(() => {
        console.log(`✅ Sleep ingestion completed for session ${session._id}`);
        return SleepAnalysisService.analyzeSession(session._id);
      }).then(async () => {
        console.log(`✅ Sleep analysis completed for session ${session._id}`);
        
        // Get Luna firmware version from session
        const sessionWithDevices = await Session.findById(session._id).populate('devices.deviceId');
        const lunaDevice = sessionWithDevices?.devices.find((d: any) => d.deviceType === 'luna');
        const lunaFirmware = lunaDevice?.firmwareVersion;
        
        // Update all summary collections (filtered by latest firmware)
        await updateAdminGlobalSummary('Sleep', true);
        if (lunaFirmware) {
          await updateFirmwarePerformanceForLuna(lunaFirmware, 'Sleep');
        }
        await updateBenchmarkComparisonSummariesForSession(session._id);
        await updateAdminDailyTrend(session.startTime, 'Sleep', true);
        
        console.log(`✅ Summary collections updated for session ${session._id}`);
      }).catch((error) => {
        console.error(`❌ Error in sleep ingestion/analysis/summary update for session ${session._id}:`, error);
      });
    } else if (metric === 'Activity') {
      // Call activity ingestion service
      IngestActivityService.ingestActivitySession(session._id, userId, files, benchmarkDeviceType, mobileType).then(() => {
        console.log(`✅ Activity ingestion completed for session ${session._id}`);
        return ActivityAnalysisService.analyzeSession(session._id);
      }).then(async () => {
        console.log(`✅ Activity analysis completed for session ${session._id}`);
        
        // Get Luna firmware version from session
        const sessionWithDevices = await Session.findById(session._id).populate('devices.deviceId');
        const lunaDevice = sessionWithDevices?.devices.find((d: any) => d.deviceType === 'luna');
        const lunaFirmware = lunaDevice?.firmwareVersion;
        
        // Update all activity summary collections
        await ActivitySummaryService.updateUserActivitySummary(userId);
        if (benchmarkDeviceType) {
          await ActivitySummaryService.updateBenchmarkComparisonSummary(benchmarkDeviceType);
        }
        await ActivitySummaryService.updateAdminGlobalSummary();
        await ActivitySummaryService.updateAdminDailyTrend(session.startTime);
        if (lunaFirmware) {
          await ActivitySummaryService.updateFirmwarePerformance(lunaFirmware);
        
        }
        
        console.log(`✅ Activity summary collections updated for session ${session._id}`);
      }).catch((error) => {
        console.error(`❌ Error in activity ingestion/analysis/summary update for session ${session._id}:`, error);
      });
    }

    
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
    const userId = req.userId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }
    
    // Get optional metric filter from query
    const metric = req.query.metric as string;
    const query: any = { userId };
    if (metric) {
      query.metric = metric;
    }
    
    const sessions = await Session.find(query)
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
    const userId = req.userId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({
        success: false,
        message: "Invalid userId"
      });
      return;
    }

    // Get optional metric filter from query
    const metric = req.query.metric as string;
    const query: any = { userId };
    if (metric) {
      query.metric = metric;
    }

    const sessions = await Session.find(query)
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



//route to get all session for a user but its id only
export const getSessionIdsByUserId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId  = req.userId;
    console.error('Received userId:', userId);
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }
    const sessions = await Session.find({ userId }, '_id').exec();
    console.error('session ids:', sessions);
    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    console.error('Error fetching session IDs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session IDs', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// Admin-only: Get session IDs for a specific user by userId param
export const getSessionIdsByUserIdParam = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { metric } = req.query;
    console.log('Admin fetching session IDs for userId:', userId, 'metric:', metric);
    if (!userId) {
      res.status(400).json({ success: false, message: 'userId required' });
      return;
    }
    const query: any = { userId };
    if (metric) {
      query.metric = metric;
    }
    const sessions = await Session.find(query, '_id name activityType startTime metric').exec();
    res.status(200).json({ success: true, count: sessions.length, data: sessions });
  } catch (error) {
    console.error('Error fetching session IDs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session IDs', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};