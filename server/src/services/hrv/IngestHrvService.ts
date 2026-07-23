import { Types } from 'mongoose';
import fs from 'fs';
import { promisify } from 'util';
import Session from '../../models/Session';
import HrvReading from '../../models/HrvReading';
import { parseFalconHrvLog } from '../../parsers/hrv/FalconHrvParser';
import { parseEliteHrvRri } from '../../parsers/hrv/EliteHrvPolarParser';
import { IHrvTick } from '../../parsers/hrv/types';

const unlinkAsync = promisify(fs.unlink);

/**
 * IngestHrvService
 * Parses the uploaded Falcon log + Elite HRV RRI export for one night and
 * writes the per-30-second readings into HrvReading. Analysis (bias/MAE/etc,
 * written into SessionAnalysis) is a separate step — see HrvAnalysisService.
 */
export class IngestHrvService {
  static async ingestHrvSession(
    sessionId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    files: Express.Multer.File[],
    benchmarkDeviceType?: string,
    mobileType?: string
  ): Promise<{ inserted: number }> {
    console.log('\n💓💓💓 ============================================');
    console.log('💓 HRV INGESTION SERVICE CALLED');
    console.log('💓💓💓 ============================================');
    console.log('   - sessionId:', sessionId);
    console.log('   - benchmarkDeviceType:', benchmarkDeviceType);
    console.log('   - files:', files?.map((f) => ({ fieldname: f.fieldname, filename: f.filename })));

    const session = await Session.findById(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    let inserted = 0;

    try {
      for (const file of files) {
        const deviceType = file.fieldname;
        const filePath = file.path;

        let ticks: IHrvTick[] = [];
        if (deviceType === 'luna') {
          const result = parseFalconHrvLog(filePath, session.startTime, session.endTime, mobileType);
          ticks = result.ticks;
          console.log(`[IngestHrvService] Falcon: ${ticks.length} ticks (dates: ${result.metadata.datesFound.join(', ')})`);
        } else if (benchmarkDeviceType && deviceType === benchmarkDeviceType) {
          const result = parseEliteHrvRri(filePath, file.originalname);
          ticks = result.ticks;
          console.log(
            `[IngestHrvService] ${deviceType}: ${ticks.length} ticks (dropped ${result.metadata.droppedTicks ?? 0})`
          );
        } else {
          console.warn(`[IngestHrvService] Skipping unrecognized field: ${deviceType}`);
          continue;
        }

        if (ticks.length === 0) continue;

        const docs = ticks.map((t) => ({
          meta: { sessionId: session._id, userId, deviceType },
          timestamp: new Date(t.unixSec * 1000),
          hrv: t.hrv,
          hr: t.hr,
          isValid: true,
        }));
        await HrvReading.insertMany(docs, { ordered: false });
        inserted += docs.length;
      }
    } finally {
      for (const file of files) {
        try {
          await unlinkAsync(file.path);
        } catch (err) {
          console.warn(`[IngestHrvService] Failed to clean up temp file ${file.path}:`, err);
        }
      }
    }

    console.log(`[IngestHrvService] Inserted ${inserted} HrvReading docs for session ${sessionId}`);
    return { inserted };
  }
}
