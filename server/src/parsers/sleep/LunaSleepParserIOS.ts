import type {
  ISleepEpochData,
  ILunaSleepMetadata,
  ILunaSleepParseResult,
  ISleepEpoch30Sec,
  SleepStageType,
} from './LunaSleepParser';
import { normalizeTimestampMs } from '../../utils/timestampNormalizer';

/**
 * iOS Sleep Distribution segment from device logs
 */
interface IOSSleepDistribution {
  startTimestamp: number; // Unix seconds
  sleepDuration: number; // Duration in seconds
  sleepDistributionType: number; // 0=AWAKE, 1=LIGHT, 2=DEEP, 3=REM
}

/**
 * Parsed iOS Sleep Data from logs
 */
interface IOSSleepData {
  entryTime: number; // Unix seconds - bed entry time
  exitTime: number; // Unix seconds - wake time
  sleepDuration: number; // Total sleep time in seconds
  timeInBedTime: number; // Total time in bed in seconds
  sleepEfficiency: number; // Sleep efficiency percentage
  sleepScore: number; // Sleep score
  awakeTime: number; // Time awake in seconds
  lightSleepTime: number; // Light sleep time in seconds
  deepSleepTime: number; // Deep sleep time in seconds
  rapidEyeMovementTime: number; // REM sleep time in seconds
  sleepDistributionDataList: IOSSleepDistribution[];
}

/**
 * Luna Sleep Parser for iOS devices
 * Parses sleep data from iOS ZHDRingsLogs.txt format
 */
export class LunaSleepParserIOS {
  /**
   * Maps iOS sleep distribution type to standard sleep stage
   */
  private static mapSleepStage(distributionType: number): SleepStageType {
    switch (distributionType) {
      case 0:
        return 'AWAKE';
      case 1:
        return 'LIGHT';
      case 2:
        return 'DEEP';
      case 3:
        return 'REM';
      default:
        console.warn(`Unknown iOS sleep distribution type: ${distributionType}, defaulting to AWAKE`);
        return 'AWAKE';
    }
  }

  /**
   * Parses iOS sleep data log entry
   * Example format:
   * LOG: 2026-Mar-03 10:39:50 : [V2.2.5.1]<SleepData> Obtained daily data:
   *  Date:2026-3-3 6:20:16
   *  entryTime:1772477280
   *  exitTime:1772498700
   *  sleepDuration:11880
   *  ...
   *  sleepDistributionDataList:startTimestamp:1772477280,sleepDuration:480,sleepDistributionType:0
   */
  private static parseSleepDataEntry(logContent: string): IOSSleepData[] {
    const sleepDataList: IOSSleepData[] = [];
    const sleepDataRegex = /<SleepData> Obtained daily data:\s*\n\s*Date:[^\n]+\s*\n\s*entryTime:(\d+)\s*\n\s*exitTime:(\d+)\s*\n\s*sleepDuration:(\d+)\s*\n\s*timeInBedTime:(\d+)[^\n]*\n\s*sleepLatency:[^\n]*\n\s*sleepEfficiency:(\d+)\s*\n\s*sleepScore:(\d+)\s*\n\s*awakeTime:(\d+)\s*\n\s*lightSleepTime:(\d+)\s*\n\s*deepSleepTime:(\d+)\s*\n\s*rapidEyeMovementTime:(\d+)\s*\n\s*sleepDistributionDataList:([\s\S]*?)(?=\n\s*sleepMovementsDataList|\n\s*LOG:|\n\s*$)/gm;

    let match;
    while ((match = sleepDataRegex.exec(logContent)) !== null) {
      const [
        ,
        entryTime,
        exitTime,
        sleepDuration,
        timeInBedTime,
        sleepEfficiency,
        sleepScore,
        awakeTime,
        lightSleepTime,
        deepSleepTime,
        rapidEyeMovementTime,
        distributionData,
      ] = match;

      // Parse sleep distribution list
      const distributionList: IOSSleepDistribution[] = [];
      const distributionRegex = /startTimestamp:(\d+),sleepDuration:(\d+),sleepDistributionType:(\d+)/g;
      let distMatch;
      while ((distMatch = distributionRegex.exec(distributionData)) !== null) {
        distributionList.push({
          startTimestamp: parseInt(distMatch[1], 10),
          sleepDuration: parseInt(distMatch[2], 10),
          sleepDistributionType: parseInt(distMatch[3], 10),
        });
      }

      sleepDataList.push({
        entryTime: parseInt(entryTime, 10),
        exitTime: parseInt(exitTime, 10),
        sleepDuration: parseInt(sleepDuration, 10),
        timeInBedTime: parseInt(timeInBedTime, 10),
        sleepEfficiency: parseInt(sleepEfficiency, 10),
        sleepScore: parseInt(sleepScore, 10),
        awakeTime: parseInt(awakeTime, 10),
        lightSleepTime: parseInt(lightSleepTime, 10),
        deepSleepTime: parseInt(deepSleepTime, 10),
        rapidEyeMovementTime: parseInt(rapidEyeMovementTime, 10),
        sleepDistributionDataList: distributionList,
      });
    }

    return sleepDataList;
  }

  /**
   * Generates 30-second epochs from sleep distribution segments
   */
  private static generate30SecEpochs(
    distributions: IOSSleepDistribution[],
    sessionId: string,
    userId: string
  ): ISleepEpoch30Sec[] {
    const epochs: ISleepEpoch30Sec[] = [];

    for (const distribution of distributions) {
      const { startTimestamp, sleepDuration, sleepDistributionType } = distribution;
      const endTimestamp = startTimestamp + sleepDuration;
      const stage = this.mapSleepStage(sleepDistributionType);

      // Generate 30-second epochs for this distribution segment
      let currentTime = startTimestamp;
      while (currentTime < endTimestamp) {
        const epochEnd = Math.min(currentTime + 30, endTimestamp);
        const epochDuration = epochEnd - currentTime;

        epochs.push({
          startSec: currentTime,
          endSec: epochEnd,
          stage,
          deviceType: 'luna',
          durationSec: epochDuration,
        });

        currentTime = epochEnd;
      }
    }

    return epochs;
  }

  /**
   * Converts 30-second epochs to epoch data format with Date objects
   * Adds 5.5 hours (IST offset) to timestamps
   */
  private static convertToEpochData(epochs: ISleepEpoch30Sec[]): ISleepEpochData[] {
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    return epochs.map((epoch) => {
      const timestampMs = epoch.startSec * 1000 + IST_OFFSET_MS;
      const normalizedTimestampMs = normalizeTimestampMs(timestampMs);

      return {
        timestamp: new Date(normalizedTimestampMs),
        stage: epoch.stage as "AWAKE" | "LIGHT" | "DEEP" | "REM",
        durationSec: epoch.durationSec,
      };
    });
  }

  /**
   * Removes duplicate epochs based on timestamp
   */
  private static deduplicateEpochs(epochs: ISleepEpochData[]): ISleepEpochData[] {
    const seen = new Set<number>();
    return epochs.filter((epoch) => {
      const timestamp = epoch.timestamp.getTime();
      if (seen.has(timestamp)) {
        return false;
      }
      seen.add(timestamp);
      return true;
    });
  }

  /**
   * Main parse method - parses iOS Luna sleep log file
   * @param filePath Local path to the iOS log file (from temp directory)
   * @param sessionId Session identifier
   * @param userId User identifier
   * @param sleepDate Optional date for which to extract sleep data
   * @returns Parsed sleep data with epochs and metadata
   */
  public static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    console.log(`📱 [LunaSleepParserIOS] Starting iOS Luna sleep data parsing for session ${sessionId}`);
    console.log(`📱 [LunaSleepParserIOS] Reading file from: ${filePath}`);

    try {
      // Read local file from temp directory
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      console.log(`📱 [LunaSleepParserIOS] File read successfully, size: ${fileContent.length} bytes`);

      // Parse all sleep data entries
      const sleepDataList = this.parseSleepDataEntry(fileContent);
      console.log(`📱 [LunaSleepParserIOS] Found ${sleepDataList.length} sleep sessions`);

      if (sleepDataList.length === 0) {
        throw new Error('No iOS sleep data found in log file');
      }

      // Use the first (or most recent) sleep session
      // TODO: If sleepDate is provided, filter to matching session
      const sleepData = sleepDataList[sleepDataList.length - 1]; // Most recent
      console.log(`📱 [LunaSleepParserIOS] Using sleep session: ${new Date(sleepData.entryTime * 1000).toISOString()}`);

      // Generate 30-second epochs
      const epochs30Sec = this.generate30SecEpochs(
        sleepData.sleepDistributionDataList,
        sessionId,
        userId
      );
      console.log(`📱 [LunaSleepParserIOS] Generated ${epochs30Sec.length} 30-second epochs`);

      // Convert to epoch data format
      const epochData = this.convertToEpochData(epochs30Sec);

      // Deduplicate
      const dedupedEpochs = this.deduplicateEpochs(epochData);
      console.log(`📱 [LunaSleepParserIOS] After deduplication: ${dedupedEpochs.length} epochs`);

      // Create metadata
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      const metadata: ILunaSleepMetadata = {
        sleepScore: sleepData.sleepScore,
        sleepEfficiency: sleepData.sleepEfficiency,
        totalSleepTimeSec: sleepData.sleepDuration,
        deepSleepSec: sleepData.deepSleepTime,
        remSleepSec: sleepData.rapidEyeMovementTime,
        lightSleepSec: sleepData.lightSleepTime,
        awakeSec: sleepData.awakeTime,
        sleepOnsetTime: new Date(sleepData.entryTime * 1000 + IST_OFFSET_MS),
        finalWakeTime: new Date(sleepData.exitTime * 1000 + IST_OFFSET_MS),
        timeInBedSec: sleepData.timeInBedTime,
      };

      console.log(`📱 [LunaSleepParserIOS] iOS Luna sleep parsing completed successfully`);
      console.log(`📱 [LunaSleepParserIOS] Metadata:`, {
        sleepScore: metadata.sleepScore,
        totalSleepTimeSec: metadata.totalSleepTimeSec,
        deepSleepSec: metadata.deepSleepSec,
        remSleepSec: metadata.remSleepSec,
        lightSleepSec: metadata.lightSleepSec,
        awakeSec: metadata.awakeSec,
      });

      return {
        epochs: dedupedEpochs,
        metadata,
      };
    } catch (error) {
      console.error(`❌ [LunaSleepParserIOS] Error parsing iOS Luna sleep data:`, error);
      throw error;
    }
  }
}
