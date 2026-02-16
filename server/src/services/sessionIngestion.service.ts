
import Session from '../models/Session';
import Device from '../models/Devices';
import NormalizedReading from '../models/NormalizedReadings';
import { parseLunaCsv } from '../parsers/lunaParser';
import { parsePolarCsv } from '../parsers/polarParser';
import { analyzeSession } from './sessionAnalysis.service';

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
        readings = await parseLunaCsv(filePath, meta, startTime, endTime);
      }
      if (deviceType === "polar") { readings = await parsePolarCsv(filePath, meta, startTime, endTime); }
      console.log(`Parsed ${readings.length} readings from ${deviceType} file.`);
      if (readings.length > 0) {
        console.log('First element of readings:', JSON.stringify(readings[0], null, 2));
      }
      if (readings.length > 0) {
        const result = await NormalizedReading.insertMany(readings, { ordered: false });
        console.log('Insert result:', result);
        console.log('for time range:', startTime.toISOString(), '-', endTime.toISOString());
        console.log(`✅ Inserted ${readings.length} readings for ${deviceType}`);
        anyInserted = true;
      }

    }
    if (anyInserted && sessionId) {
      try {
        await analyzeSession(sessionId);
        console.log('Session analysis completed for session:', sessionId);
      } catch (err) {
        console.error('❌ Session analysis failed:', err);
      }
    }
    }
    // After all device files processed, run analysis if any readings were inserted
    
  catch (err) {
    console.error("❌ Background parsing failed:", err);
  }
}