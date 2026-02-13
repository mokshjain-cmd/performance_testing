import Session from '../models/Session';
import Device from '../models/Devices';
import NormalizedReading from '../models/NormalizedReadings';
import { parseLunaCsv } from '../parsers/lunaParser';
import { parsePolarCsv } from '../parsers/polarParser';

export async function ingestSessionFiles({
  sessionId,
  userId,
  startTime,
  endTime,
  files,
}: any) {
    try {
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
      };

      let readings: any[] = [];

      if (deviceType === "luna") {
        readings = await parseLunaCsv(filePath, meta, startTime, endTime);
      }
      if (deviceType === "polar") { readings = await parsePolarCsv(filePath, meta, startTime, endTime); }

      if (readings.length > 0) {
        await NormalizedReading.insertMany(readings, { ordered: false });
        console.log(`✅ Inserted ${readings.length} readings for ${deviceType}`);
      }
    }
  } catch (err) {
    console.error("❌ Background parsing failed:", err);
  }
}