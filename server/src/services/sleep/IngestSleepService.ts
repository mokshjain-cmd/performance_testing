import { Types } from "mongoose";
import Session from "../../models/Session";
import SleepStageEpoch from "../../models/SleepStageEpoch";
import { LunaSleepParser } from "../../parsers/sleep/LunaSleepParser";
import { AppleSleepParser } from "../../parsers/sleep/AppleSleepParser";
import User from "../../models/Users";
import Device from "../../models/Devices";
import { mailService } from "../mail.service";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { extractAppleHealthZip, deleteDirectory, deleteFile } from '../../tools/zipExtractor';

const unlinkAsync = promisify(fs.unlink);

export class IngestSleepService {
  /**
   * Main entry point: Ingest sleep data after session creation
   * This will be called from the session controller after a sleep session is created
   * 
   * @param sessionId - The ID of the sleep session
   * @param userId - User ID
   * @param files - Array of uploaded files from multer
   * @param benchmarkDeviceType - Optional benchmark device type (apple, garmin, etc.)
   * @param mobileType - Optional mobile type (Android/iOS) for Luna device to determine parser
   */
  static async ingestSleepSession(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    files: Express.Multer.File[],
    benchmarkDeviceType?: string,
    mobileType?: string
  ): Promise<void> {
    let userEmail: string | undefined;
    let userName: string | undefined;
    let sessionName: string | undefined;
    const metric = 'Sleep';
    const extractedFolders: string[] = []; // Track extracted folders for cleanup
    
    try {
      console.log(`[IngestSleepService] Starting sleep ingestion for session: ${sessionId}`);
      if (mobileType) {
        console.log(`[IngestSleepService] Mobile type specified: ${mobileType}`);
      }

      // Fetch user details for email notification
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          userEmail = user.email;
          userName = user.name;
        }
      }
      
      // Fetch session name for email notification
      if (sessionId) {
        const session = await Session.findById(sessionId);
        if (session) {
          sessionName = session.name;
        }
      }

      console.log(`[IngestSleepService] Processing ${files.length} files`);

      let anyInserted = false;

      // Process each file
      for (const file of files) {
        const deviceType = file.fieldname;
        const filePath = file.path;
        console.log(`[IngestSleepService] Processing file for device: ${deviceType}, path: ${filePath}`);

        if (deviceType === "luna") {
          // Process Luna sleep data
          const epochsInserted = await this.processLunaSleepData(
            sessionId,
            userId,
            filePath,
            mobileType
          );
          if (epochsInserted > 0) anyInserted = true;
        } else if (benchmarkDeviceType && deviceType === benchmarkDeviceType) {
          // Process benchmark sleep data (Apple, Garmin, etc.)
          const result = await this.processBenchmarkSleepData(
            sessionId,
            userId,
            filePath,
            benchmarkDeviceType
          );
          if (result.epochsInserted > 0) anyInserted = true;
          // Track extracted folder if ZIP was extracted
          if (result.extractedFolder) {
            extractedFolders.push(result.extractedFolder);
          }
        } else {
          console.warn(`[IngestSleepService] Unknown device type: ${deviceType}`);
        }
      }

      if (!anyInserted) {
        console.warn(`[IngestSleepService] No sleep epochs were inserted for session ${sessionId}`);
      }

      console.log(`[IngestSleepService] Sleep ingestion completed for session: ${sessionId}`);

      // Send success email notification
      if (userEmail && userName && sessionId && sessionName) {
        console.log('📧 Sending sleep session completion email...');
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
      console.error(`[IngestSleepService] Error ingesting sleep session ${sessionId}:`, error);

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
        console.log('📧 Sending sleep session failure email...');
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
          console.log(`🗑️ Deleting ${files.length} temp files after sleep ingestion`);
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
          console.log(`🗑️ Deleting ${extractedFolders.length} extracted folders after sleep ingestion`);
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
   * Process Luna sleep data
   * Parse the file and store epochs in SleepStageEpoch collection
   * @param mobileType Optional mobile type (Android/iOS) to determine which parser to use
   * @returns Number of epochs inserted
   */
  private static async processLunaSleepData(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    filePath: string,
    mobileType?: string
  ): Promise<number> {
    try {
      console.log(`[IngestSleepService] Processing Luna sleep data from: ${filePath}`);
      console.log(`[IngestSleepService] Mobile type: ${mobileType || 'Android (default)'}`);

      // Import iOS parser dynamically to avoid circular dependencies
      let parseResult;
      
      if (mobileType === 'iOS') {
        console.log(`[IngestSleepService] Using iOS Luna parser`);
        const { LunaSleepParserIOS } = await import('../../parsers/sleep/LunaSleepParserIOS');
        parseResult = await LunaSleepParserIOS.parse(filePath, sessionId.toString(), userId.toString());
      } else {
        // Default to Android parser for backward compatibility
        console.log(`[IngestSleepService] Using Android Luna parser`);
        parseResult = await LunaSleepParser.parse(filePath, sessionId.toString(), userId.toString());
      }

      // Get firmware version from session devices
      const session = await Session.findById(sessionId).populate("devices.deviceId");
      const lunaDevice = session?.devices.find((d: any) => d.deviceType === "luna");
      const firmwareVersion = lunaDevice?.firmwareVersion;

      // Store each epoch in the database
      if (parseResult.epochs && parseResult.epochs.length > 0) {
        const epochDocs = parseResult.epochs.map((epoch) => ({
          meta: {
            sessionId,
            userId,
            deviceType: "luna",
            firmwareVersion,
          },
          timestamp: epoch.timestamp,
          durationSec: epoch.durationSec,
          stage: epoch.stage,
        }));

        await SleepStageEpoch.insertMany(epochDocs);
        console.log(`[IngestSleepService] ✅ Inserted ${epochDocs.length} Luna sleep epochs`);
        
        // Store Luna metadata (sleep score, efficiency, etc.)
        if (parseResult.metadata) {
          console.log(`[IngestSleepService] Luna metadata:`, parseResult.metadata);
          // TODO: Store this in SessionAnalysis or a separate metadata collection
        }
        
        return epochDocs.length;
      } else {
        console.warn(`[IngestSleepService] No Luna epochs parsed from file`);
        return 0;
      }

    } catch (error) {
      console.error(`[IngestSleepService] Error processing Luna sleep data:`, error);
      throw error;
    }
  }

  /**
   * Process benchmark sleep data (Apple, Garmin, Polar, etc.)
   * Parse the file and store epochs in SleepStageEpoch collection
   * @returns Object with number of epochs inserted and extracted folder path (if ZIP was extracted)
   */
  private static async processBenchmarkSleepData(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    filePath: string,
    benchmarkDeviceType: string
  ): Promise<{ epochsInserted: number; extractedFolder?: string }> {
    let extractedFolder: string | undefined;

    try {
      console.log(`[IngestSleepService] Processing ${benchmarkDeviceType} sleep data from: ${filePath}`);

      let fileToProcess = filePath;

      // Check if the file is a ZIP (for Apple Health export)
      const fileExtension = path.extname(filePath).toLowerCase();
      if (benchmarkDeviceType === 'apple' && fileExtension === '.zip') {
        console.log(`[IngestSleepService] Detected Apple Health ZIP file, extracting...`);
        
        try {
          const { exportXmlPath, extractedFolder: extracted } = await extractAppleHealthZip(filePath);
          fileToProcess = exportXmlPath;
          extractedFolder = extracted;
          console.log(`[IngestSleepService] Using export.xml from: ${exportXmlPath}`);
        } catch (zipError) {
          console.error(`[IngestSleepService] Error extracting Apple Health ZIP:`, zipError);
          throw new Error(`Failed to extract Apple Health ZIP: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
        }
      }

      // Call the appropriate benchmark parser
      let parseResult;
      if (benchmarkDeviceType === 'apple') {
        const { AppleHealthSleepParser } = await import('../../parsers/sleep/AppleHealthSleepParser');
        parseResult = await AppleHealthSleepParser.parse(fileToProcess, sessionId.toString(), userId.toString());
      } else {
        // For other benchmarks, use AppleSleepParser as fallback
        parseResult = await AppleSleepParser.parse(fileToProcess, sessionId.toString(), userId.toString());
      }

      // Get firmware version from session devices (if applicable)
      const session = await Session.findById(sessionId).populate("devices.deviceId");
      const benchmarkDevice = session?.devices.find((d: any) => d.deviceType === benchmarkDeviceType);
      const firmwareVersion = benchmarkDevice?.firmwareVersion;

      // Store each epoch in the database
      if (parseResult.epochs && parseResult.epochs.length > 0) {
        const epochDocs = parseResult.epochs.map((epoch) => ({
          meta: {
            sessionId,
            userId,
            deviceType: benchmarkDeviceType,
            firmwareVersion,
          },
          timestamp: epoch.timestamp,
          durationSec: epoch.durationSec,
          stage: epoch.stage,
        }));

        await SleepStageEpoch.insertMany(epochDocs);
        console.log(`[IngestSleepService] ✅ Inserted ${epochDocs.length} ${benchmarkDeviceType} sleep epochs`);
        
        // Store benchmark metadata
        if (parseResult.metadata) {
          console.log(`[IngestSleepService] ${benchmarkDeviceType} metadata:`, parseResult.metadata);
          // TODO: Store this in SessionAnalysis
        }
        
        return {
          epochsInserted: epochDocs.length,
          extractedFolder
        };
      } else {
        console.warn(`[IngestSleepService] No ${benchmarkDeviceType} epochs parsed from file`);
        return {
          epochsInserted: 0,
          extractedFolder
        };
      }

    } catch (error) {
      console.error(`[IngestSleepService] Error processing ${benchmarkDeviceType} sleep data:`, error);
      throw error;
    }
  }

  /**
   * Cleanup: Delete all sleep epochs for a session
   * Useful for re-ingestion or session deletion
   */
  static async deleteSessionEpochs(sessionId: Types.ObjectId | string): Promise<void> {
    try {
      const result = await SleepStageEpoch.deleteMany({
        "meta.sessionId": sessionId,
      });
      console.log(`[IngestSleepService] Deleted ${result.deletedCount} epochs for session ${sessionId}`);
    } catch (error) {
      console.error(`[IngestSleepService] Error deleting epochs:`, error);
      throw error;
    }
  }
}
