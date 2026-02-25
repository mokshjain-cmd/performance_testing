
import Session from '../models/Session';
import Device from '../models/Devices';
import NormalizedReading from '../models/NormalizedReadings';
import { parseLunaCsv } from '../parsers/lunaParser';
import { parsePolarCsv } from '../parsers/polarParser';
import { analyzeSession } from './sessionAnalysis.service';
import { updateUserAccuracySummary } from './userAccuracySummary.service';
import { updateLunaFirmwarePerformanceForSession } from './lunaFirmwarePerformanceUpdate.service';
import { convertLunaTxtToCsv } from '../tools/lunaTxtToCsv';
import { updateActivityPerformanceSummary } from './activityPerformanceSummary.service';
import { updateAdminDailyTrend } from './adminDailyTrend.service';
import { updateAdminGlobalSummary } from './adminGlobalSummary.service';
import { updateBenchmarkComparisonSummariesForSession } from './benchmarkComparisonSummary.service';
import fs from 'fs';
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
}: any) {
    try {
    let anyInserted = false;
    for (const file of files) {
      const deviceType = file.fieldname;
      const filePath = file.path;
      console.log(`Processing file for device: ${deviceType}, path: ${filePath}`);

      const device = await Device.findOne({ deviceType });
      if (!device) continue;
      

      const meta = {
        sessionId: sessionId,
        userId: userId,
        firmwareVersion: device.firmwareVersion,
        bandPosition: bandPosition,
        activityType: activityType,
      };

      let readings: any[] = [];

      if (deviceType === "luna") {
        // Convert .txt to .csv with header if needed
        const csvFilePath = await convertLunaTxtToCsv(filePath);
        readings = await parseLunaCsv(csvFilePath, meta, startTime, endTime);
      }
      if (deviceType === "polar") { readings = await parsePolarCsv(filePath, meta, startTime, endTime); }
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
        
        // Update user accuracy summary after analysis
        if (userId) {
          await updateUserAccuracySummary(userId);
          console.log('User accuracy summary updated for user:', userId);
        }
        
        // Update Luna firmware performance for this session
        await updateLunaFirmwarePerformanceForSession(sessionId);
        
        // Update activity performance summary
        if (activityType) {
          await updateActivityPerformanceSummary(activityType);
          console.log('Activity performance summary updated for:', activityType);
        }
        
        // Update admin daily trend for session date
        if (startTime) {
          await updateAdminDailyTrend(startTime);
          console.log('Admin daily trend updated for session date');
        }
        
        // Update benchmark comparison summaries for devices in this session
        await updateBenchmarkComparisonSummariesForSession(sessionId);
        
        // Update admin global summary
        await updateAdminGlobalSummary();
        console.log('Admin global summary updated');
        
      } catch (err) {
        console.error('❌ Session analysis failed:', err);
      }
    }
    
    // Delete temp files after all processing is complete
    console.log(`🗑️ Deleting ${files.length} temp files after processing`);
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
    
    }
    // After all device files processed, run analysis if any readings were inserted
    
  catch (err) {
    console.error("❌ Background parsing failed:", err);
  }
}