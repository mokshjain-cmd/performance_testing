
import Session from '../models/Session';
import Device from '../models/Devices';
import User from '../models/Users';
import NormalizedReading from '../models/NormalizedReadings';
import { parseLunaCsv } from '../parsers/lunaParser';
import { parsePolarCsv } from '../parsers/polarParser';
import { LunaIOSHRParser } from '../parsers/lunaiosHRparser';
import { parseAppleHR } from '../parsers/appleHRparser';
import { analyzeSession } from './sessionAnalysis.service';
import { updateUserAccuracySummary } from './userAccuracySummary.service';
import { updateLunaFirmwarePerformanceForSession } from './lunaFirmwarePerformanceUpdate.service';
import { convertLunaTxtToCsv } from '../tools/lunaTxtToCsv';
import { updateActivityPerformanceSummary } from './activityPerformanceSummary.service';
import { updateAdminDailyTrend } from './adminDailyTrend.service';
import { updateAdminGlobalSummary } from './adminGlobalSummary.service';
import { updateBenchmarkComparisonSummariesForSession } from './benchmarkComparisonSummary.service';
import { mailService } from './mail.service';
import { extractAppleHealthZip, deleteDirectory } from '../tools/zipExtractor';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

export async function ingestSessionFiles({
  sessionId,
  userId,
  activityType,
  bandPosition,
  startTime,
  endTime,
  files,
  mobileType,
}: any) {
    let userEmail: string | undefined;
    let userName: string | undefined;
    let sessionName: string | undefined;
    const metric = 'HR';
    const extractedFolders: string[] = []; // Track extracted folders for cleanup
    
    try {
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
    
    // Get session to access device firmware versions
    const session = await Session.findById(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    let anyInserted = false;
    for (const file of files) {
      const deviceType = file.fieldname;
      const filePath = file.path;
      console.log(`Processing file for device: ${deviceType}, path: ${filePath}`);

      const device = await Device.findOne({ deviceType });
      if (!device) continue;
      
      // Get firmware version from session's devices array, not from Device lookup
      const sessionDevice = session.devices.find((d: any) => d.deviceType === deviceType);
      const firmwareVersion = sessionDevice?.firmwareVersion || device.firmwareVersion;

      const meta = {
        sessionId: sessionId,
        userId: userId,
        firmwareVersion: firmwareVersion,
        bandPosition: bandPosition,
        activityType: activityType,
      };

      let readings: any[] = [];

      if (deviceType === "luna") {
        // Check if it's iOS daily activity - use iOS-specific parser
        if (activityType === "daily" && mobileType === "iOS") {
          console.log('Using Luna iOS HR parser for daily activity');
          try {
            readings = await LunaIOSHRParser.parse(filePath, meta, startTime, endTime);
            console.log(`Parsed ${readings.length} readings from Luna iOS file.`);
          } catch (iosParseError) {
            console.error('❌ Luna iOS HR parser failed, falling back to standard parser:', iosParseError);
            // Fallback to standard parser if iOS parser fails
            const csvFilePath = await convertLunaTxtToCsv(filePath);
            readings = await parseLunaCsv(csvFilePath, meta, startTime, endTime);
            console.log(`Parsed ${readings.length} readings from Luna file (fallback).`);
          }
        } else {
          // Use standard Luna parser for Android or non-daily activities
          console.log('Using standard Luna HR parser');
          const csvFilePath = await convertLunaTxtToCsv(filePath);
          readings = await parseLunaCsv(csvFilePath, meta, startTime, endTime);
          console.log(`Parsed ${readings.length} readings from Luna file.`);
        }
      }
      if (deviceType === "apple") {
        console.log('Parsing Apple HR file:', filePath);
        let fileToProcess = filePath;
        let extractedFolder: string | undefined;
        
        try {
          // Check if the file is a ZIP (for Apple Health export)
          const fileExtension = path.extname(filePath).toLowerCase();
          if (fileExtension === '.zip') {
            console.log('🍎 Detected Apple Health ZIP file, extracting...');
            try {
              const { exportXmlPath, extractedFolder: extracted } = await extractAppleHealthZip(filePath);
              fileToProcess = exportXmlPath;
              extractedFolder = extracted;
              extractedFolders.push(extracted); // Track for cleanup
              console.log(`🍎 Using export.xml from: ${exportXmlPath}`);
            } catch (zipError) {
              console.error('❌ Error extracting Apple Health ZIP:', zipError);
              throw new Error(`Failed to extract Apple Health ZIP: ${zipError instanceof Error ? zipError.message : 'Unknown error'}`);
            }
          }
          
          // Parse the Apple HR file (either original file or extracted export.xml)
          readings = await parseAppleHR(fileToProcess, meta, startTime, endTime);
          console.log(`Parsed ${readings.length} readings from Apple file.`);
        } catch (appleParseError) {
          console.error('❌ Apple HR parser failed:', appleParseError);
          throw appleParseError;
        }
      }
      if (deviceType === "polar") { 
        console.log('Parsing Polar file:', filePath);
        readings = await parsePolarCsv(filePath, meta, startTime, endTime); }
      console.log(`Parsed ${readings.length} readings from ${deviceType} file.`);
      if (readings.length > 0) {
        //console.log('First element of readings:', JSON.stringify(readings[0], null, 2));
      }
      if (readings.length > 0) {
        const result = await NormalizedReading.insertMany(readings, { ordered: false });
        //console.log('Insert result:', result);
        console.log('for time range:', startTime.toISOString(), '-', endTime.toISOString());
        console.log(`✅ Inserted ${readings.length} readings for ${deviceType}`);
        anyInserted = true;
      }

    }
    if (anyInserted && sessionId) {
      try {
        await analyzeSession(sessionId);
        console.log('Session analysis completed for session:', sessionId);
        
        // Get session to access metric
        const session = await Session.findById(sessionId);
        const metric = session?.metric || 'HR';
        
        // Update user accuracy summary after analysis
        if (userId) {
          await updateUserAccuracySummary(userId, metric);
          console.log('User accuracy summary updated for user:', userId, 'metric:', metric);
        }
        
        // Update Luna firmware performance for this session
        await updateLunaFirmwarePerformanceForSession(sessionId);
        
        // Update activity performance summary (only for HR sessions)
        if (activityType && metric === 'HR') {
          await updateActivityPerformanceSummary(activityType);
          console.log('Activity performance summary updated for:', activityType);
        }
        
        // Update admin daily trend for session date
        if (startTime) {
          await updateAdminDailyTrend(startTime, metric, true);
          console.log('Admin daily trend updated for session date, metric:', metric);
        }
        
        // Update benchmark comparison summaries for devices in this session
        await updateBenchmarkComparisonSummariesForSession(sessionId);
        
        // Update admin global summary (filtered by latest firmware)
        console.log(`\n📊 ========================================`);
        console.log(`📊 Calling updateAdminGlobalSummary for metric: ${metric}`);
        console.log(`📊 ========================================`);
        await updateAdminGlobalSummary(metric, true);
        console.log(`📊 Finished updateAdminGlobalSummary call`);
        console.log(`📊 ========================================\n`);
        
      } catch (err) {
        console.error('❌ Session analysis failed:', err);
        // Swallow here — we'll mark session invalid and notify in catch below
      }
    }

    // Send success email notification
    if (userEmail && userName && sessionId && sessionName) {
      console.log('📧 Sending session completion email...');
      await mailService.sendSessionAnalysisNotification(
        userEmail,
        userName,
        sessionId.toString(),
        sessionName,
        'success',
        metric
      );
    }

  } catch (err) {
    console.error("❌ HR session ingestion failed:", err);

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
      console.log('📧 Sending session failure email...');
      await mailService.sendSessionAnalysisNotification(
        userEmail,
        userName,
        sessionId.toString(),
        sessionName,
        'failed',
        metric,
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    }

    
  } finally {
    // Ensure temp files are deleted whether processing succeeded or failed
    try {
      if (files && files.length > 0) {
        console.log(`🗑️ Deleting ${files.length} temp files after processing`);
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
        console.log(`🗑️ Deleting ${extractedFolders.length} extracted folders after processing`);
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