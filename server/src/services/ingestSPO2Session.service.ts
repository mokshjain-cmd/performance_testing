import Session from '../models/Session';
import Device from '../models/Devices';
import User from '../models/Users';
import NormalizedReading from '../models/NormalizedReadings';
import { parseMasimoSpo2Csv } from '../parsers/masimoSpo2Parser';
import { parseLunaSpo2Csv } from '../parsers/lunaSpo2Parser';
import { analyzeSession } from './sessionAnalysis.service';
import { updateUserAccuracySummary } from './userAccuracySummary.service';
import { updateLunaFirmwarePerformanceForSession } from './lunaFirmwarePerformanceUpdate.service';
import { updateActivityPerformanceSummary } from './activityPerformanceSummary.service';
import { updateAdminDailyTrend } from './adminDailyTrend.service';
import { updateAdminGlobalSummary } from './adminGlobalSummary.service';
import { updateBenchmarkComparisonSummariesForSession } from './benchmarkComparisonSummary.service';
import { mailService } from './mail.service';
import { convertLunaTxtToCsv } from '../tools/lunaTxtToCsv';
import fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

/**
 * Ingest SPO2 session files from Masimo and Luna devices
 * Similar to HR ingestion but uses SPO2-specific parsers
 */
export async function ingestSPO2SessionFiles({
  sessionId,
  userId,
  activityType,
  bandPosition,
  startTime,
  endTime,
  files,
}: {
  sessionId: any;
  userId: any;
  activityType: string;
  bandPosition?: string;
  startTime: Date;
  endTime: Date;
  files: any[];
}) {
  let userEmail: string | undefined;
  let userName: string | undefined;
  let sessionName: string | undefined;
  let metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps' = 'SPO2';
  
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
    
    console.log("\n===============================");
    console.log("🩺 Starting SPO2 Session Ingestion...");
    console.log("📋 Session ID:", sessionId);
    console.log("👤 User ID:", userId);
    console.log("🏃 Activity Type:", activityType);
    console.log("📍 Band Position:", bandPosition);
    console.log("🕒 Time Range:", startTime.toISOString(), "to", endTime.toISOString());
    console.log("📁 Files Count:", files.length);
    console.log("===============================\n");

    let anyInserted = false;

    for (const file of files) {
      const deviceType = file.fieldname;
      const filePath = file.path;
      console.log(`\n📂 Processing SPO2 file for device: ${deviceType}`);
      console.log(`📂 File path: ${filePath}`);

      const device = await Device.findOne({ deviceType });
      if (!device) {
        console.warn(`⚠️ Device not found in database: ${deviceType}`);
        continue;
      }

      const meta = {
        sessionId: sessionId,
        userId: userId,
        firmwareVersion: device.firmwareVersion,
        bandPosition: bandPosition,
        activityType: activityType,
      };

      let readings: any[] = [];

      // Parse based on device type - using SPO2-specific parsers
      if (deviceType === "masimo") {
        console.log("🩺 Parsing Masimo SPO2 file...");
        readings = await parseMasimoSpo2Csv(filePath, meta, startTime, endTime);
        console.log(`✅ Parsed ${readings.length} SPO2 readings from Masimo file.`);
      } else if (deviceType === "luna") {
        console.log("🩺 Parsing Luna SPO2 file...");
        // Convert .txt to .csv with header if needed
        const csvFilePath = await convertLunaTxtToCsv(filePath);
        readings = await parseLunaSpo2Csv(csvFilePath, meta, startTime, endTime);
        console.log(`✅ Parsed ${readings.length} SPO2 readings from Luna file.`);
      } else {
        console.warn(`⚠️ Unknown device type for SPO2: ${deviceType}`);
      }

      if (readings.length > 0) {
        console.log(`💾 Inserting ${readings.length} readings into database...`);
        const result = await NormalizedReading.insertMany(readings, { ordered: false });
        console.log(`✅ Inserted ${readings.length} SPO2 readings for ${deviceType}`);
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

        // Get session to access metric
        const session = await Session.findById(sessionId);
        metric = session?.metric || 'SPO2';

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

        // Update activity performance summary no activity performance in SPO2 sessions, but keeping this here for future when we add more metrics to SPO2 sessions
        

        // Update admin daily trend for session date
        if (startTime) {
          console.log("📊 Updating admin daily trend...");
          await updateAdminDailyTrend(startTime, metric);
          console.log("✅ Admin daily trend updated for session date, metric:", metric);
        }

        // Update benchmark comparison summaries for devices in this session
        console.log("📊 Updating benchmark comparison summaries...");
        await updateBenchmarkComparisonSummariesForSession(sessionId);
        console.log("✅ Benchmark comparison summaries updated");

        // Update admin global summary
        console.log("📊 Updating admin global summary...");
        await updateAdminGlobalSummary(metric);
        console.log("✅ Admin global summary updated for metric:", metric);

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

    console.log("\n===============================");
    console.log("✅ SPO2 Session Ingestion Complete!");
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
    console.error("❌ SPO2 session ingestion failed:", err);
    
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
