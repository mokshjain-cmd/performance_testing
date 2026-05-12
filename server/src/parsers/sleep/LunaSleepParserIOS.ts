import type {
  ISleepEpochData,
  ILunaSleepMetadata,
  ILunaSleepParseResult,
  ISleepEpoch30Sec,
  SleepStageType,
} from './LunaSleepParser';
import { normalizeTimestampMs } from '../../utils/timestampNormalizer';

interface IOSSleepDistribution {
  startTimestamp: number;
  sleepDuration: number;
  sleepDistributionType: number; // 0=AWAKE, 1=LIGHT, 2=DEEP, 3=REM
}

interface IOSSleepData {
  entryTime: number;
  exitTime: number;
  sleepDuration: number;
  timeInBedTime: number;
  sleepEfficiency: number;
  sleepScore: number;
  awakeTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  rapidEyeMovementTime: number;
  sleepDistributionDataList: IOSSleepDistribution[];
}

export class LunaSleepParserIOS {
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
        return 'AWAKE';
    }
  }

  /**
   * Supports:
   * 1. Old <SleepData> text logs
   * 2. New protobuf gomore_sleep_result_data logs
   */
  private static parseSleepDataEntry(logContent: string): IOSSleepData[] {
    const sleepDataList: IOSSleepData[] = [];

    // ==========================
    // FORMAT 1 → legacy
    // ==========================
    const legacyRegex =
      /<SleepData> Obtained daily data:\s*\n\s*Date:[^\n]+\s*\n\s*entryTime:(\d+)\s*\n\s*exitTime:(\d+)\s*\n\s*sleepDuration:(\d+)\s*\n\s*timeInBedTime:(\d+)[^\n]*\n\s*sleepLatency:[^\n]*\n\s*sleepEfficiency:(\d+)\s*\n\s*sleepScore:(\d+)\s*\n\s*awakeTime:(\d+)\s*\n\s*lightSleepTime:(\d+)\s*\n\s*deepSleepTime:(\d+)\s*\n\s*rapidEyeMovementTime:(\d+)\s*\n\s*sleepDistributionDataList:([\s\S]*?)(?=\n\s*sleepMovementsDataList|\n\s*LOG:|\n\s*$)/gm;

    let match: RegExpExecArray | null;

    while ((match = legacyRegex.exec(logContent)) !== null) {
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

      const distributionList: IOSSleepDistribution[] = [];

      const distributionRegex =
        /startTimestamp:(\d+),sleepDuration:(\d+),sleepDistributionType:(\d+)/g;

      let distMatch: RegExpExecArray | null;

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

    // ==========================
    // FORMAT 2 → protobuf
    // ==========================
    const protoBlocks =
      logContent.match(/gomore_sleep_result_data\s*\{[\s\S]*?\n\s*\}\s*\}/gm) || [];

    for (const block of protoBlocks) {
      const extract = (field: string): number => {
        const regex = new RegExp(`${field}:\\s*(\\d+)`);
        const m = block.match(regex);
        return m ? parseInt(m[1], 10) : 0;
      };

      const distributionList: IOSSleepDistribution[] = [];

      const distRegex =
        /start_timestamp:\s*(\d+)[\s\S]*?sleep_duration:\s*(\d+)[\s\S]*?sleep_distribution_type:\s*(AWAKE|LIGHT_SLEEP|DEEP_SLEEP|RAPID_EYE_MOVEMENT)/g;

      let distMatch: RegExpExecArray | null;

      while ((distMatch = distRegex.exec(block)) !== null) {
        const stageMap: Record<string, number> = {
          AWAKE: 0,
          LIGHT_SLEEP: 1,
          DEEP_SLEEP: 2,
          RAPID_EYE_MOVEMENT: 3,
        };

        distributionList.push({
          startTimestamp: parseInt(distMatch[1], 10),
          sleepDuration: parseInt(distMatch[2], 10),
          sleepDistributionType: stageMap[distMatch[3]] ?? 0,
        });
      }

      if (distributionList.length > 0) {
        sleepDataList.push({
          entryTime: extract('entry_time'),
          exitTime: extract('exit_time'),
          sleepDuration: extract('sleep_duration'),
          timeInBedTime: extract('time_in_bed_time'),
          sleepEfficiency: extract('sleep_efficiency'),
          sleepScore: extract('sleep_score'),
          awakeTime: extract('awake_time'),
          lightSleepTime: extract('light_sleep_time'),
          deepSleepTime: extract('deep_sleep_time'),
          rapidEyeMovementTime: extract('rapid_eye_movement_time'),
          sleepDistributionDataList: distributionList,
        });
      }
    }

    return sleepDataList;
  }

  private static generate30SecEpochs(
    distributions: IOSSleepDistribution[]
  ): ISleepEpoch30Sec[] {
    const epochs: ISleepEpoch30Sec[] = [];

    for (const distribution of distributions) {
      const { startTimestamp, sleepDuration, sleepDistributionType } = distribution;
      const endTimestamp = startTimestamp + sleepDuration;
      const stage = this.mapSleepStage(sleepDistributionType);

      let currentTime = startTimestamp;

      while (currentTime < endTimestamp) {
        const epochEnd = Math.min(currentTime + 30, endTimestamp);

        epochs.push({
          startSec: currentTime,
          endSec: epochEnd,
          stage,
          deviceType: 'luna',
          durationSec: epochEnd - currentTime,
        });

        currentTime = epochEnd;
      }
    }

    return epochs;
  }

  private static convertToEpochData(
    epochs: ISleepEpoch30Sec[]
  ): ISleepEpochData[] {
    const IST_OFFSET_MS = 19800000;

    return epochs.map((epoch) => {
      const timestampMs = epoch.startSec * 1000 + IST_OFFSET_MS;
      const normalizedTimestampMs = normalizeTimestampMs(timestampMs);

      return {
        timestamp: new Date(normalizedTimestampMs),
        stage: epoch.stage as 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM',
        durationSec: epoch.durationSec,
      };
    });
  }

  private static deduplicateEpochs(
    epochs: ISleepEpochData[]
  ): ISleepEpochData[] {
    const seen = new Set<number>();

    return epochs.filter((epoch) => {
      const ts = epoch.timestamp.getTime();

      if (seen.has(ts)) {
        return false;
      }

      seen.add(ts);
      return true;
    });
  }

  private static dateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private static findSleepByExitDate(
    sleepDataList: IOSSleepData[],
    targetDate: Date
  ): IOSSleepData | null {
    const targetDateStr = this.dateToString(targetDate);

    const IST_OFFSET_SEC = 19800;
    const useIST = process.env.MODE === 'uat';
    const offsetSec = useIST ? IST_OFFSET_SEC : 0;

    for (const sleepData of sleepDataList) {
      const exitDate = new Date((sleepData.exitTime + offsetSec) * 1000);
      const exitDateStr = this.dateToString(exitDate);

      if (exitDateStr === targetDateStr) {
        return sleepData;
      }
    }

    return null;
  }

  public static async parse(
    filePath: string,
    sessionId: string,
    userId: string,
    sleepDate?: Date
  ): Promise<ILunaSleepParseResult> {
    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');

      const sleepDataList = this.parseSleepDataEntry(fileContent);

      if (sleepDataList.length === 0) {
        throw new Error('No iOS sleep data found');
      }

      let sleepData: IOSSleepData | null;

      if (sleepDate) {
        sleepData = this.findSleepByExitDate(sleepDataList, sleepDate);

        if (!sleepData) {
          return {
            epochs: [],
            metadata: {},
          };
        }
      } else {
        sleepData = sleepDataList[sleepDataList.length - 1];
      }

      const epochs30Sec = this.generate30SecEpochs(
        sleepData.sleepDistributionDataList
      );

      const epochData = this.convertToEpochData(epochs30Sec);

      const dedupedEpochs = this.deduplicateEpochs(epochData);

      const IST_OFFSET_MS = 19800000;

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

      return {
        epochs: dedupedEpochs,
        metadata,
      };
    } catch (error) {
      console.error('[LunaSleepParserIOS] parse failed', error);
      throw error;
    }
  }
}