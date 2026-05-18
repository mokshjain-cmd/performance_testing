import { Request, Response } from 'express';
import Session from '../models/Session';
import Device from '../models/Devices';
import mongoose from "mongoose";
import path from 'path';
import { ingestSessionFiles } from '../services/sessionIngestion.service';
import { ingestSPO2SessionFiles } from '../services/ingestSPO2Session.service';
import { IngestSleepService } from '../services/sleep/IngestSleepService';
import { SleepAnalysisService } from '../services/sleep/SleepAnalysisService';
import { IngestActivityService } from '../services/activity/IngestActivityService';
import { ActivityAnalysisService } from '../services/activity/ActivityAnalysisService';
import { ActivitySummaryService } from '../services/activity/ActivitySummaryService';
import { ingestSkinTempSessionFiles } from '../services/ingestSkinTempSession.service';
import { IngestWorkoutService } from '../services/workout/IngestWorkoutService';
import { deleteSession as deleteSessionService } from '../services/sessionDeletion.service';
import storageService from '../services/storage.service';
import { updateAdminGlobalSummary } from '../services/adminGlobalSummary.service';
import { updateFirmwarePerformanceForLuna } from '../services/firmwarePerformance.service';
import { updateBenchmarkComparisonSummariesForSession } from '../services/benchmarkComparisonSummary.service';
import { updateAdminDailyTrend } from '../services/adminDailyTrend.service';
import { ManualActivityService } from '../services/activity/ManualActivityService';

/**
 * Create a new session with device files
 * Expects multipart/form-data with:
 * - userId, activityType, startTime, endTime
 * - benchmarkDeviceType (optional)
 * - deviceFiles[] - array of raw files (fieldname should be deviceType)
 */


function parseISTString(dateStr: string): Date {
  // Expecting: "2026-02-13T15:20:50" or "2026-02-13T15:20" (without seconds)
  const [datePart, timePart] = dateStr.split("T");

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

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
export const createManualActivitySession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    const {
      sessionName,
      activityDate,
      firmwareVersion,
      benchmarkDeviceType,
      bandPosition,
      luna,
      benchmark,
    } = req.body;

    /**
     * VALIDATIONS
     */

    if (!userId) {
      res.status(400).json({
        success: false,
        message: "Missing userId",
      });
      return;
    }

    if (!activityDate) {
      res.status(400).json({
        success: false,
        message: "activityDate is required",
      });
      return;
    }

    if (!firmwareVersion) {
      res.status(400).json({
        success: false,
        message: "firmwareVersion is required",
      });
      return;
    }

    if (!luna && !benchmark) {
      res.status(400).json({
        success: false,
        message:
          "At least one of luna or benchmark data is required",
      });
      return;
    }

    /**
     * DATE RANGE
     */

    const [year, month, day] = activityDate
      .split("-")
      .map(Number);

    const start = new Date(
      Date.UTC(year, month - 1, day, 0, 0, 0)
    );

    const end = new Date(
      Date.UTC(year, month - 1, day, 23, 59, 59)
    );

    const durationSec = Math.floor(
      (end.getTime() - start.getTime()) / 1000
    );

    /**
     * DEVICES
     */

    const devices: any[] = [];

    /**
     * LUNA DEVICE
     */

    if (luna) {
      const lunaDevice = await Device.findOne({
        deviceType: "luna",
        firmwareVersion,
      });

      if (!lunaDevice) {
        throw new Error(
          `Luna device with firmware ${firmwareVersion} not found`
        );
      }

      devices.push({
        deviceId: lunaDevice._id,
        deviceType: "luna",
        firmwareVersion,
      });
    }

    /**
     * BENCHMARK DEVICE
     */

    if (benchmark && benchmarkDeviceType) {
      const benchmarkDevice = await Device.findOne({
        deviceType: benchmarkDeviceType,
      });

      if (!benchmarkDevice) {
        throw new Error(
          `Benchmark device ${benchmarkDeviceType} not found`
        );
      }

      devices.push({
        deviceId: benchmarkDevice._id,
        deviceType: benchmarkDeviceType,
        firmwareVersion:
          benchmarkDevice.firmwareVersion,
      });
    }

    /**
     * CREATE SESSION
     */

    const session = await Session.create({
      userId,
      name: sessionName || "Manual Activity Session",

      activityType: "daily",
      metric: "Activity",

      startTime: start,
      endTime: end,

      durationSec,

      devices,

      benchmarkDeviceType,

      bandPosition,
    });

    console.log(
      `✅ Manual activity session created: ${session._id}`
    );

    /**
     * INSERT MANUAL READINGS
     */
    console.log("data for luna : ", luna);
    console.log("data for benchmark : ", benchmark);
      await ManualActivityService.insertManualActivityReadings(
      session._id,
      userId,
      start,
      {
        luna,
        benchmark,
      },
      benchmarkDeviceType
    );

    console.log(
      `✅ Manual activity readings inserted`
    );

    /**
     * ANALYSIS
     */

    await ActivityAnalysisService.analyzeSession(
      session._id
    );

    console.log(
      `✅ Activity analysis completed`
    );

    /**
     * SUMMARIES
     */

    const lunaFirmware = firmwareVersion;

    await ActivitySummaryService.updateUserActivitySummary(
      userId
    );

    if (benchmarkDeviceType) {
      await ActivitySummaryService.updateBenchmarkComparisonSummary(
        benchmarkDeviceType
      );
    }

    await ActivitySummaryService.updateAdminGlobalSummary();

    await ActivitySummaryService.updateAdminDailyTrend(
      session.startTime
    );

    if (lunaFirmware) {
      await ActivitySummaryService.updateFirmwarePerformance(
        lunaFirmware
      );
    }

    console.log(
      `✅ Activity summaries updated`
    );

    /**
     * RESPONSE
     */

    res.status(201).json({
      success: true,
      message:
        "Manual activity session created successfully",
      data: session,
    });
  } catch (error) {
    console.error(
      "❌ Error creating manual activity session:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });
  }
};

// In your controller
export const createManualSleepSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const {
      sessionName,
      sleepDate,
      firmwareVersion,
      benchmarkDeviceType,
      manualData // This matches the IManualSleepData interface
    } = req.body;

    // 1. Calculate Start/End times just like you do in standard ingestion
    const [year, month, day] = sleepDate.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, day - 1, 21, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
    const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);
    console.log(`\n🛌 Creating manual sleep session with data ${JSON.stringify(manualData)}`);
    // 2. Resolve Device IDs (similar to current logic, simplified here)
    const lunaDevice = await Device.findOne({ deviceType: 'luna', firmwareVersion });
    if (!lunaDevice) {
      res.status(400).json({
        success: false,
        message: `Luna device with firmware version ${firmwareVersion} not found. Please ensure this firmware version is registered.`
      });
      return;
    }
    const devices = [{ deviceId: lunaDevice._id, deviceType: 'luna', firmwareVersion }];
    
    if (benchmarkDeviceType) {
        const benchDevice = await Device.findOne({ deviceType: benchmarkDeviceType });
        if(benchDevice) devices.push({ deviceId: benchDevice._id, deviceType: benchmarkDeviceType, firmwareVersion: benchDevice.firmwareVersion });
    }

    // 3. Create Session DB Record (No rawFiles mapped)
    const session = await Session.create({
      userId,
      name: sessionName,
      activityType: 'daily',
      metric: 'Sleep',
      startTime: start,
      endTime: end,
      durationSec,
      devices,
      benchmarkDeviceType,
    });

    // 4. Analyze directly via our new Manual Analysis method
    await SleepAnalysisService.analyzeManualSession(session._id, manualData);

    // 5. Update global, firmware, and user summaries
    await updateAdminGlobalSummary('Sleep', true);
    await updateFirmwarePerformanceForLuna(firmwareVersion, 'Sleep');
    if (benchmarkDeviceType) {
        await updateBenchmarkComparisonSummariesForSession(session._id);
    }
    await updateAdminDailyTrend(session.startTime, 'Sleep', true);

    res.status(201).json({ success: true, data: session });

  } catch (error :any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
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
      sleepDate,
      activityDate,
      workoutDate,
      dailyDate,
      benchmarkDeviceType,
      bandPosition,
      firmwareVersion,
      mobileType,
      appPlatform,
    } = req.body;

    if (!userId || !metric) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, metric',
      });
      return;
    }

    if (metric !== 'Activity' && metric !== 'Workout' && !activityType) {
      res.status(400).json({
        success: false,
        message: 'activityType is required for non-Activity sessions',
      });
      return;
    }

    const validMetrics = [
      'HR',
      'SPO2',
      'Sleep',
      'Activity',
      'SkinTemp',
      'Stress',
      'Workout',
    ];

    if (!validMetrics.includes(metric)) {
      res.status(400).json({
        success: false,
        message: `Invalid metric. Must be one of: ${validMetrics.join(', ')}`,
      });
      return;
    }

    // -------------------------------------------------------
    // Unified file loader (IMPORTANT FIX)
    // -------------------------------------------------------
    let files: any[] = [];

    if (req.files && (req.files as any[]).length > 0) {
      files = req.files as Express.Multer.File[];
    } else if (req.body.uploadedFiles) {
      const uploadedFiles = JSON.parse(req.body.uploadedFiles);

      files = uploadedFiles.map((f: any) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        filename: `${f.uploadId}.tmp`,
        path: path.join(process.cwd(), 'temp', 'uploads', `${f.uploadId}.tmp`),
      }));
    }

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
      return;
    }

    // =======================================================
    // WORKOUT
    // =======================================================
    if (metric === 'Workout') {
      if (!workoutDate) {
        res.status(400).json({
          success: false,
          message: 'workoutDate is required',
        });
        return;
      }

      if (!firmwareVersion) {
        res.status(400).json({
          success: false,
          message: 'firmwareVersion is required',
        });
        return;
      }

      const lunaFile = files.find((f) => f.fieldname === 'luna');

      if (!lunaFile) {
        res.status(400).json({
          success: false,
          message: 'Luna file required',
        });
        return;
      }

      const benchmarkFile = benchmarkDeviceType
        ? files.find((f) => f.fieldname === benchmarkDeviceType)
        : undefined;

      const [year, month, day] = workoutDate.split('-').map(Number);
      const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

      const result = await IngestWorkoutService.ingestWorkoutDay(
        userId,
        targetDate,
        firmwareVersion,
        lunaFile,
        benchmarkFile,
        benchmarkDeviceType,
        mobileType
      );

      res.status(201).json({
        success: true,
        message: `Found ${result.sessionsCreated} workouts`,
        data: result,
      });

      return;
    }

    // =======================================================
    // DATE RANGE
    // =======================================================
    let start: Date;
    let end: Date;

    if (metric === 'Sleep') {
      if (!sleepDate) {
        res.status(400).json({
          success: false,
          message: 'sleepDate required',
        });
        return;
      }

      const [year, month, day] = sleepDate.split('-').map(Number);

      start = new Date(Date.UTC(year, month - 1, day - 1, 21, 0, 0));
      end = new Date(Date.UTC(year, month - 1, day, 9, 0, 0));

    } else if (metric === 'Activity') {
      if (!activityDate) {
        res.status(400).json({
          success: false,
          message: 'activityDate required',
        });
        return;
      }

      const [year, month, day] = activityDate.split('-').map(Number);

      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    } else if (
      ['HR', 'SPO2', 'SkinTemp'].includes(metric) &&
      activityType === 'daily' &&
      dailyDate
    ) {
      const [year, month, day] = dailyDate.split('-').map(Number);

      start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    } else {
      if (!startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'Missing startTime/endTime',
        });
        return;
      }

      start = parseISTString(startTime);
      end = parseISTString(endTime);
    }

    if (!firmwareVersion) {
      res.status(400).json({
        success: false,
        message: 'firmwareVersion is required',
      });
      return;
    }

    const durationSec = Math.floor(
      (end.getTime() - start.getTime()) / 1000
    );

    // =======================================================
    // DEVICE RESOLUTION
    // =======================================================
    const devices = await Promise.all(
      files.map(async (file) => {
        const deviceType = file.fieldname;

        let device;

        if (deviceType === 'luna') {
          device = await Device.findOne({
            deviceType,
            firmwareVersion,
          });

          if (!device) {
            throw new Error(
              `Luna device with firmware ${firmwareVersion} not found`
            );
          }

          return {
            deviceId: device._id,
            deviceType,
            firmwareVersion,
          };
        }

        device = await Device.findOne({ deviceType });

        if (!device) {
          throw new Error(`Device not registered: ${deviceType}`);
        }

        return {
          deviceId: device._id,
          deviceType,
          firmwareVersion: device.firmwareVersion,
        };
      })
    );

    // =======================================================
    // SESSION CREATE
    // =======================================================
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

    // =======================================================
    // GCS
    // =======================================================
    if (process.env.ENV === 'production') {
      try {
        const rawFiles = await storageService.uploadDeviceFiles(
          files,
          session._id.toString()
        );

        session.rawFiles = rawFiles;
        await session.save();
      } catch (err) {
        console.error('GCS upload failed', err);
      }
    }

    // =======================================================
    // PIPELINES
    // =======================================================
    try {
      if (metric === 'HR') {
        await ingestSessionFiles({
          sessionId: session._id,
          userId,
          activityType,
          bandPosition,
          startTime: start,
          endTime: end,
          files,
          mobileType,
        });

      } else if (metric === 'SPO2') {
        await ingestSPO2SessionFiles({
          sessionId: session._id,
          userId,
          activityType,
          bandPosition,
          startTime: start,
          endTime: end,
          files,
          mobileType,
        });

      } else if (metric === 'SkinTemp') {
        await ingestSkinTempSessionFiles({
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
        await IngestSleepService.ingestSleepSession(
          session._id,
          userId,
          files,
          benchmarkDeviceType,
          mobileType,
          appPlatform
        );

        await SleepAnalysisService.analyzeSession(session._id);

        const s = await Session.findById(session._id);
        const lunaFirmware = s?.devices.find((d: any) => d.deviceType === 'luna')
          ?.firmwareVersion;

        await updateAdminGlobalSummary('Sleep', true);

        if (lunaFirmware) {
          await updateFirmwarePerformanceForLuna(lunaFirmware, 'Sleep');
        }

        await updateBenchmarkComparisonSummariesForSession(session._id);
        await updateAdminDailyTrend(session.startTime, 'Sleep', true);

      } else if (metric === 'Activity') {
        await IngestActivityService.ingestActivitySession(
          session._id,
          userId,
          files,
          benchmarkDeviceType,
          mobileType,
          appPlatform
        );

        await ActivityAnalysisService.analyzeSession(session._id);

        const s = await Session.findById(session._id);
        const lunaFirmware = s?.devices.find((d: any) => d.deviceType === 'luna')
          ?.firmwareVersion;

        await ActivitySummaryService.updateUserActivitySummary(userId);

        if (benchmarkDeviceType) {
          await ActivitySummaryService.updateBenchmarkComparisonSummary(
            benchmarkDeviceType
          );
        }

        await ActivitySummaryService.updateAdminGlobalSummary();
        await ActivitySummaryService.updateAdminDailyTrend(session.startTime);

        if (lunaFirmware) {
          await ActivitySummaryService.updateFirmwarePerformance(lunaFirmware);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Session created and fully processed',
        data: session,
      });

    } catch (pipelineError) {
      console.error('Pipeline error', pipelineError);

      res.status(500).json({
        success: false,
        message:
          pipelineError instanceof Error
            ? pipelineError.message
            : 'Pipeline failed',
        data: {
          sessionId: session._id,
        },
      });
    }

  } catch (error) {
    console.error('Error creating session:', error);

    res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : 'Unknown error',
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
    const sessions = await Session.find(query, '_id name activityType startTime metric devices sportType')
      .sort({ startTime: -1 }) // Sort by most recent first
      .exec();
    
    // Extract Luna firmware version for each session
    const sessionsWithFirmware = sessions.map(session => {
      const lunaDevice = session.devices.find((d: any) => d.deviceType?.toLowerCase() === 'luna');
      return {
        _id: session._id,
        name: session.name,
        activityType: session.activityType,
        sportType: session.sportType,
        startTime: session.startTime,
        metric: session.metric,
        firmwareVersion: lunaDevice?.firmwareVersion || 'N/A'
      };
    });
    
    res.status(200).json({ success: true, count: sessionsWithFirmware.length, data: sessionsWithFirmware });
  } catch (error) {
    console.error('Error fetching session IDs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session IDs', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};