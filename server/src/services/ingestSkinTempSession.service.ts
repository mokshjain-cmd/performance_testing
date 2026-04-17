import Session from '../models/Session';
import Device from '../models/Devices';
import User from '../models/Users';
import NormalizedReading from '../models/NormalizedReadings';
import { LunaAndroidSkinTempParser } from '../parsers/DailyParsers/Lunaandroidapp';
import { AppleHealthSkinTempParser, IAppleSkinTempRecord } from '../parsers/AppleHealthSkinTempParser';
import { extractAppleHealthZip, deleteDirectory } from '../tools/zipExtractor';
import { analyzeSession } from './sessionAnalysis.service';
import { updateUserAccuracySummary } from './userAccuracySummary.service';
import { updateLunaFirmwarePerformanceForSession } from './lunaFirmwarePerformanceUpdate.service';
import { updateAdminDailyTrend } from './adminDailyTrend.service';
import { updateAdminGlobalSummary } from './adminGlobalSummary.service';
import { updateBenchmarkComparisonSummariesForSession } from './benchmarkComparisonSummary.service';
import { mailService } from './mail.service';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

/**
 * Ingest SkinTemp session files from Luna and benchmark devices
 * Similar to HR/SPO2 ingestion but uses SkinTemp-specific parsers
 */
export async function ingestSkinTempSessionFiles({
  sessionId,
  userId,
  activityType,
  bandPosition,
  startTime,
  endTime,
  files,
  mobileType,
}: {
  sessionId: any;
  userId: any;
  activityType: string;
  bandPosition?: string;
  startTime: Date;
  endTime: Date;
  files: any[];
  mobileType?: string;
}) {
  let userEmail: string | undefined;
  let userName: string | undefined;
  let sessionName: string | undefined;
  const metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' = 'SkinTemp';
  
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
      const sessionDoc = await Session.findById(sessionId);
      if (sessionDoc) {
        sessionName = sessionDoc.name;
      }
    }
    
    console.log('\n🌡️🌡️🌡️ ============================================');
    console.log('🌡️ SKINTEMP INGESTION SERVICE CALLED');
    console.log('🌡️🌡️🌡️ ============================================');
    console.log('📊 Received Parameters:');
    console.log('   - sessionId:', sessionId);
    console.log('   - userId:', userId);
    console.log('   - activityType:', activityType);
    console.log('   - bandPosition:', bandPosition);
    console.log('   - startTime:', startTime);
    console.log('   - endTime:', endTime);
    console.log('   - mobileType:', mobileType);
    console.log('   - files:', files?.map((f: any) => ({ fieldname: f.fieldname, filename: f.filename })));
    console.log('🌡️🌡️🌡️ ============================================\n');
    
    console.log("\n===============================");
    console.log("🌡️ Starting SkinTemp Session Ingestion...");
    console.log("📋 Session ID:", sessionId);
    console.log("👤 User ID:", userId);
    console.log("🏃 Activity Type:", activityType);
    console.log("📱 Mobile Type:", mobileType || 'Not specified');
    console.log("📍 Band Position:", bandPosition);
    console.log("🕒 Time Range:", startTime.toISOString(), "to", endTime.toISOString());
    console.log("📁 Files Count:", files.length);
    console.log("===============================\n");

    // Get session to access device firmware versions
    const session = await Session.findById(sessionId);
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    let anyInserted = false;
    let extractedFolder: string | undefined; // Track extracted ZIP folder for cleanup

    for (const file of files) {
      const deviceType = file.fieldname;
      const filePath = file.path;
      console.log(`\n📂 Processing SkinTemp file for device: ${deviceType}`);
      console.log(`📂 File path: ${filePath}`);

      const device = await Device.findOne({ deviceType });
      if (!device) {
        console.warn(`⚠️ Device not found in database: ${deviceType}`);
        continue;
      }

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

      // Parse based on device type - using SkinTemp-specific parsers
      if (deviceType === "luna") {
        console.log("🌡️ Parsing Luna SkinTemp file...");
        console.log(`📱 Mobile Type: ${mobileType}, Activity Type: ${activityType}`);
        
        // Use different parsers based on mobileType and activityType
        if (activityType === "daily" && mobileType?.toLowerCase() === "android") {
          console.log("🤖 Using Luna Android SkinTemp parser for daily activity...");
          readings = await LunaAndroidSkinTempParser.parse(filePath, meta, startTime, endTime);
        } else if (activityType === "daily" && mobileType?.toLowerCase() === "ios") {
          // iOS parser placeholder
          console.warn("🍎 Luna iOS SkinTemp parser not implemented yet. Skipping...");
        } else {
          console.warn(`⚠️ SkinTemp parser only supports "daily" activity type with Android/iOS. Current: activityType=${activityType}, mobileType=${mobileType}`);
        }
        
        console.log(`✅ Parsed ${readings.length} SkinTemp readings from Luna file.`);
      } else if (deviceType === "apple") {
        // Handle Apple Health skin temp (ZIP or XML)
        console.log("🍎 Parsing Apple Health SkinTemp file...");
        
        let appleFilePath = filePath;
        const fileExtension = path.extname(filePath).toLowerCase();
        
        // Handle ZIP extraction
        if (fileExtension === '.zip') {
          console.log("🍎 Detected Apple Health ZIP file, extracting...");
          try {
            const extracted = await extractAppleHealthZip(filePath);
            appleFilePath = extracted.exportXmlPath;
            extractedFolder = extracted.extractedFolder;
            console.log(`🍎 Using export.xml from: ${appleFilePath}`);
          } catch (zipError) {
            console.error("❌ Error extracting Apple Health ZIP:", zipError);
            continue;
          }
        }
        
        try {
          // Parse Apple skin temp records
          const appleTempRecords = await AppleHealthSkinTempParser.parseSkinTempRecords(
            appleFilePath,
            startTime,
            endTime
          );
          
          if (appleTempRecords.length > 0) {
            // Find the record that best matches our session time window
            const matchedRecord = AppleHealthSkinTempParser.findMatchingRecord(
              appleTempRecords,
              startTime,
              endTime
            );
            
            if (matchedRecord) {
              console.log(`🍎 Using Apple skin temp: ${matchedRecord.temperatureCelsius.toFixed(2)}°C`);
              console.log(`🍎 Sleep period: ${matchedRecord.startTime.toISOString()} to ${matchedRecord.endTime.toISOString()}`);
              
              // Store as a SINGLE reading with the average temperature
              // Note: Apple only provides ONE value per sleep session
              readings = [{
                meta: {
                  sessionId: sessionId,
                  userId: userId,
                  deviceType: 'apple',
                  activityType: activityType,
                  bandPosition: undefined,
                  firmwareVersion: undefined,
                },
                timestamp: matchedRecord.startTime, // Use sleep start as timestamp
                metrics: {
                  skinTemp: matchedRecord.temperatureCelsius,
                },
                isValid: true,
              }];
              
              console.log(`✅ Created 1 Apple SkinTemp reading (avg over ${(matchedRecord.durationSec / 3600).toFixed(1)} hours sleep)`);
            } else {
              console.warn("⚠️ No Apple skin temp record found matching session time window");
            }
          } else {
            console.warn("⚠️ No Apple skin temp records found in file");
          }
        } catch (parseError) {
          console.error("❌ Error parsing Apple Health skin temp:", parseError);
        }
      } else {
        // Future: Add other benchmark device parsers
        console.warn(`⚠️ SkinTemp parser not yet implemented for device: ${deviceType}`);
      }

      if (readings.length > 0) {
        console.log(`💾 Inserting ${readings.length} readings into database...`);
        const result = await NormalizedReading.insertMany(readings, { ordered: false });
        console.log(`✅ Inserted ${readings.length} SkinTemp readings for ${deviceType}`);
        console.log(`📊 Time range: ${startTime.toISOString()} - ${endTime.toISOString()}`);
        anyInserted = true;
      } else {
        console.warn(`⚠️ No readings found for ${deviceType} in the specified time range.`);
      }
    }

    // Run analysis and update summaries if any readings were inserted
    if (anyInserted && sessionId) {
      try {
        console.log("\n📊 Running session analysis...");
        await analyzeSession(sessionId);
        console.log("✅ Session analysis completed for session:", sessionId);

        // Update user accuracy summary after analysis
        if (userId) {
          console.log("📊 Updating user accuracy summary...");
          await updateUserAccuracySummary(userId, metric);
          console.log("✅ User accuracy summary updated for user:", userId, "metric:", metric);
        }

        // Update Luna firmware performance for this session
        console.log("📊 Updating firmware performance...");
        await updateLunaFirmwarePerformanceForSession(sessionId);
        console.log("✅ Firmware performance updated");

        // Update admin daily trend for session date
        if (startTime) {
          console.log("📊 Updating admin daily trend...");
          await updateAdminDailyTrend(startTime, metric, true);
          console.log("✅ Admin daily trend updated for session date, metric:", metric);
        }

        // Update benchmark comparison summaries for devices in this session
        console.log("📊 Updating benchmark comparison summaries...");
        await updateBenchmarkComparisonSummariesForSession(sessionId);
        console.log("✅ Benchmark comparison summaries updated");

        // Update admin global summary (filtered by latest firmware)
        console.log(`\n📊 ========================================`);
        console.log(`📊 Calling updateAdminGlobalSummary for metric: ${metric}`);
        console.log(`📊 ========================================`);
        await updateAdminGlobalSummary(metric, true);
        console.log(`📊 Finished updateAdminGlobalSummary call`);
        console.log(`📊 ========================================\n`);

      } catch (err) {
        console.error("❌ Session analysis or summary update failed:", err);
      }
    }

    // Delete temp files after all processing is complete
    console.log(`\n🗑️ Cleaning up ${files.length} temp files...`);
    await Promise.allSettled(
      files.map(async (file: any) => {
        try {
          await unlinkAsync(file.path);
          console.log(`✅ Deleted temp file: ${file.filename}`);
        } catch (deleteError) {
          console.warn(`⚠️ Could not delete temp file ${file.filename}:`, deleteError);
        }
      })
    );
    
    // Clean up extracted ZIP folder if any
    if (extractedFolder) {
      try {
        await deleteDirectory(extractedFolder);
        console.log(`✅ Deleted extracted folder: ${extractedFolder}`);
      } catch (deleteError) {
        console.warn(`⚠️ Could not delete extracted folder:`, deleteError);
      }
    }

    console.log("\n===============================");
    console.log("✅ SkinTemp Session Ingestion Complete!");
    console.log("===============================\n");
    
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
    console.error("❌ SkinTemp session ingestion failed:", err);
    
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
    
    throw err;
  }
}
