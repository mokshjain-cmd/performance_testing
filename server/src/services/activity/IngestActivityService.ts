import { Types } from "mongoose";
import Session from "../../models/Session";
import ActivityDailyReading from "../../models/ActivityDailyReading";
import { LunaActivityParser } from "../../parsers/activity/LunaActivityParser";
import { FalconLunaActivityParser } from "../../parsers/activity/FalconLunaActivityParser";
import { AppleHealthActivityParser } from "../../parsers/activity/AppleHealthActivityParser";
import User from "../../models/Users";
import Device from "../../models/Devices";
import { mailService } from "../mail.service";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { extractAppleHealthZip, deleteDirectory, deleteFile } from '../../tools/zipExtractor';

const unlinkAsync = promisify(fs.unlink);

export class IngestActivityService {
  /**
   * Main entry point: Ingest activity data after session creation
   * This will be called from the session controller after an activity session is created
   * 
   * @param sessionId - The ID of the activity session
   * @param userId - User ID
   * @param files - Array of uploaded files from multer
   * @param benchmarkDeviceType - Optional benchmark device type (apple, garmin, etc.)
   * @param mobileType - Optional mobile type (Android/iOS) for Luna device to determine parser
   * @param appPlatform - Optional app platform (NoiseFit/Luna) for Luna device to determine parser format
   */
  static async ingestActivitySession(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    files: Express.Multer.File[],
    benchmarkDeviceType?: string,
    mobileType?: string,
    appPlatform?: string
  ): Promise<void> {
    let userEmail: string | undefined;
    let userName: string | undefined;
    let sessionName: string | undefined;
    let sessionStartTime: Date | undefined;
    let sessionEndTime: Date | undefined;
    const metric = 'Activity'; // Unified metric for steps, calories, and distance
    const extractedFolders: string[] = []; // Track extracted folders for cleanup
    
    try {
      console.log(`[IngestActivityService] Starting activity ingestion for session: ${sessionId}`);
      if (mobileType) {
        console.log(`[IngestActivityService] Mobile type specified: ${mobileType}`);
      }
      if (appPlatform) {
        console.log(`[IngestActivityService] App platform specified: ${appPlatform}`);
      }

      // Fetch user details for email notification
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email;
          userName = user.name;
        }
      }
      
      // Fetch session details
      if (sessionId) {
        const session = await Session.findById(sessionId);
        if (session) {
          sessionName = session.name;
          sessionStartTime = session.startTime;
          sessionEndTime = session.endTime;
        }
      }

      console.log(`[IngestActivityService] Processing ${files.length} files`);

      let anyInserted = false;

      // Process each file
      for (const file of files) {
        const deviceType = file.fieldname;
        const filePath = file.path;
        console.log(`[IngestActivityService] Processing file for device: ${deviceType}, path: ${filePath}`);

        if (deviceType === "luna") {
          // Process Luna activity data
          const recordsInserted = await this.processLunaActivityData(
            sessionId,
            userId,
            filePath,
            mobileType,
            appPlatform,
            sessionStartTime,
            sessionEndTime
          );
          if (recordsInserted > 0) anyInserted = true;
        } else if (benchmarkDeviceType && deviceType === benchmarkDeviceType) {
          // Process benchmark activity data (Apple, Garmin, etc.)
          const result = await this.processBenchmarkActivityData(
            sessionId,
            userId,
            filePath,
            benchmarkDeviceType,
            sessionStartTime,
            sessionEndTime
          );
          if (result.recordsInserted > 0) anyInserted = true;
          // Track extracted folder if ZIP was extracted
          if (result.extractedFolder) {
            extractedFolders.push(result.extractedFolder);
          }
        } else {
          console.warn(`[IngestActivityService] Unknown device type: ${deviceType}`);
        }
      }

      if (!anyInserted) {
        console.warn(`[IngestActivityService] No activity records were inserted for session ${sessionId}`);
      }

      console.log(`[IngestActivityService] Activity ingestion completed for session: ${sessionId}`);

      // Send success email notification
      if (userEmail && userName && sessionId && sessionName) {
        console.log('📧 Sending activity session completion email...');
        await mailService.sendSessionAnalysisNotification(
          userEmail,
          userName,
          sessionId.toString(),
          sessionName,
          'success',
          metric
        );
      }

    } catch (error) {
      console.error(`[IngestActivityService] Error ingesting activity session ${sessionId}:`, error);

      // Mark session as invalid so UI/consumers know this session had ingestion issues
      try {
        if (sessionId) {
          await Session.findByIdAndUpdate(sessionId, { isValid: false });
          console.log(`⚠️ Session ${sessionId} marked as invalid due to ingestion failure`);
        }
      } catch (updateErr) {
        console.error('❌ Failed to mark session as invalid:', updateErr);
      }

      // Send failure email notification
      if (userEmail && userName && sessionId && sessionName) {
        console.log('📧 Sending activity session failure email...');
        await mailService.sendSessionAnalysisNotification(
          userEmail,
          userName,
          sessionId.toString(),
          sessionName,
          'failed',
          metric,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }

      throw error;
    } finally {
      // Ensure temp files are deleted whether processing succeeded or failed
      try {
        if (files && files.length > 0) {
          console.log(`🗑️ Deleting ${files.length} temp files after activity ingestion`);
          await Promise.allSettled(
            files.map(async (file: any) => {
              try {
                if (file && file.path) await unlinkAsync(file.path);
                console.log(`✅ Deleted temp file: ${file.filename}`);
              } catch (deleteError) {
                console.warn(`⚠️ Could not delete temp file ${file?.filename}:`, deleteError);
              }
            })
          );
        }
      } catch (finalErr) {
        console.warn('⚠️ Error during final temp file cleanup:', finalErr);
      }

      // Clean up extracted folders (from ZIP files)
      try {
        if (extractedFolders.length > 0) {
          console.log(`🗑️ Deleting ${extractedFolders.length} extracted folders after activity ingestion`);
          await Promise.allSettled(
            extractedFolders.map(async (folderPath: string) => {
              try {
                await deleteDirectory(folderPath);
                console.log(`✅ Deleted extracted folder: ${folderPath}`);
              } catch (deleteError) {
                console.warn(`⚠️ Could not delete extracted folder ${folderPath}:`, deleteError);
              }
            })
          );
        }
      } catch (finalErr) {
        console.warn('⚠️ Error during extracted folder cleanup:', finalErr);
      }
    }
  }

  /**
   * Process Luna activity data
   * Parse the file and store daily totals in ActivityDailyReading collection
   * @param mobileType Optional mobile type (Android/iOS) to determine which parser to use
   * @param appPlatform Optional app platform (NoiseFit/Luna) to determine parser format
   * @param startDate Optional start date to filter activity data
   * @param endDate Optional end date to filter activity data
   * @returns Number of records inserted
   */
  private static async processLunaActivityData(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    filePath: string,
    mobileType?: string,
    appPlatform?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      console.log(`[IngestActivityService] Processing Luna activity data from: ${filePath}`);
      console.log(`[IngestActivityService] Mobile type: ${mobileType || 'Android (default)'}`);      
      console.log(`[IngestActivityService] App platform: ${appPlatform || 'NoiseFit (default)'}`);      
      if (startDate && endDate) {
        console.log(`[IngestActivityService] 📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
      }

      let parseResult;
      
      // Route to correct parser based on appPlatform and mobileType
      if (appPlatform === 'Luna') {
        // Use Falcon Luna Android parser for app logs
        console.log(`[IngestActivityService] Using Falcon Luna Activity parser (App Logs)`);
        parseResult = await FalconLunaActivityParser.parseFalconLunaActivityFile(filePath, startDate, endDate);
      } else if (mobileType === 'iOS') {
        console.log(`[IngestActivityService] Using iOS Luna parser`);
        parseResult = await LunaActivityParser.parseLunaActivityFileIOS(filePath, startDate, endDate);
      } else {
        // Default to Android parser for backward compatibility
        console.log(`[IngestActivityService] Using Android Luna parser`);
        parseResult = await LunaActivityParser.parseLunaActivityFileAndroid(filePath, startDate, endDate);
      }

      // Get firmware version from session devices
      const session = await Session.findById(sessionId).populate("devices.deviceId");
      const lunaDevice = session?.devices.find((d: any) => d.deviceType === "luna");
      const firmwareVersion = lunaDevice?.firmwareVersion;

      // Store each daily total in the database
      if (parseResult.dailyTotals && parseResult.dailyTotals.length > 0) {
        const dailyDocs = parseResult.dailyTotals.map((daily) => ({
          meta: {
            sessionId,
            userId,
            deviceType: "luna",
            firmwareVersion,
            date: daily.date,
          },
          totals: {
            steps: daily.steps,
            distanceMeters: daily.distanceMeters,
            caloriesTotal: daily.caloriesTotal,
            caloriesActive: daily.caloriesActive,
            caloriesBasal: daily.caloriesBasal,
          },
        }));

        await ActivityDailyReading.insertMany(dailyDocs);
        console.log(`[IngestActivityService] ✅ Inserted ${dailyDocs.length} Luna activity daily records`);
        
        return dailyDocs.length;
      } else {
        console.warn(`[IngestActivityService] No Luna activity records parsed from file`);
        return 0;
      }

    } catch (error) {
      console.error(`[IngestActivityService] Error processing Luna activity data:`, error);
      throw error;
    }
  }

  /**
   * Process benchmark activity data (Apple, Garmin, Polar, etc.)
   * Parse the file and store daily totals in ActivityDailyReading collection
   * @returns Object with number of records inserted and extracted folder path (if ZIP was extracted)
   */
  private static async processBenchmarkActivityData(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    filePath: string,
    benchmarkDeviceType: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ recordsInserted: number; extractedFolder?: string }> {
    let extractedFolder: string | undefined;

    try {
      console.log(`[IngestActivityService] Processing ${benchmarkDeviceType} activity data from: ${filePath}`);

      let fileToProcess = filePath;

      // Check if the file is a ZIP (for Apple Health export)
      const fileExtension = path.extname(filePath).toLowerCase();
      if (benchmarkDeviceType === 'apple' && fileExtension === '.zip') {
        console.log(`[IngestActivityService] Detected Apple Health ZIP file, extracting...`);
        
        try {
          const { exportXmlPath, extractedFolder: extracted } = await extractAppleHealthZip(filePath);
          fileToProcess = exportXmlPath;
          extractedFolder = extracted;
          console.log(`[IngestActivityService] Using export.xml from: ${exportXmlPath}`);
        } catch (zipError) {
          console.error(`[IngestActivityService] Error extracting Apple Health ZIP:`, zipError);
          throw new Error(`Failed to extract Apple Health ZIP: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
        }
      }

      // Call the appropriate benchmark parser
      let parseResult;
      if (benchmarkDeviceType === 'apple') {
        parseResult = await AppleHealthActivityParser.parse(
          fileToProcess, 
          sessionId.toString(), 
          userId.toString(), 
          startDate, 
          endDate
        );
      } else {
        // For other benchmarks, throw error for now (can be extended later)
        throw new Error(`Benchmark device type '${benchmarkDeviceType}' not yet supported for activity data`);
      }

      // Get firmware version from session devices (if applicable)
      const session = await Session.findById(sessionId).populate("devices.deviceId");
      const benchmarkDevice = session?.devices.find((d: any) => d.deviceType === benchmarkDeviceType);
      const firmwareVersion = benchmarkDevice?.firmwareVersion;

      // Store each daily total in the database
      if (parseResult.dailyTotals && parseResult.dailyTotals.length > 0) {
        const dailyDocs = parseResult.dailyTotals.map((daily) => ({
          meta: {
            sessionId,
            userId,
            deviceType: benchmarkDeviceType,
            firmwareVersion,
            date: daily.date,
          },
          totals: {
            steps: daily.steps,
            distanceMeters: daily.distanceMeters,
            caloriesTotal: daily.caloriesTotal,
            caloriesActive: daily.caloriesActive,
            caloriesBasal: daily.caloriesBasal,
          },
        }));

        await ActivityDailyReading.insertMany(dailyDocs);
        console.log(`[IngestActivityService] ✅ Inserted ${dailyDocs.length} ${benchmarkDeviceType} activity daily records`);
        
        return {
          recordsInserted: dailyDocs.length,
          extractedFolder
        };
      } else {
        console.warn(`[IngestActivityService] No ${benchmarkDeviceType} activity records parsed from file`);
        return {
          recordsInserted: 0,
          extractedFolder
        };
      }

    } catch (error) {
      console.error(`[IngestActivityService] Error processing ${benchmarkDeviceType} activity data:`, error);
      throw error;
    }
  }

  /**
   * Cleanup: Delete all activity daily readings for a session
   * Useful for re-ingestion or session deletion
   */
  static async deleteSessionActivityDailyReadings(sessionId: Types.ObjectId | string): Promise<void> {
    try {
      const result = await ActivityDailyReading.deleteMany({
        "meta.sessionId": sessionId,
      });
      console.log(`[IngestActivityService] Deleted ${result.deletedCount} activity daily readings for session ${sessionId}`);
    } catch (error) {
      console.error(`[IngestActivityService] Error deleting activity daily readings:`, error);
      throw error;
    }
  }
}
