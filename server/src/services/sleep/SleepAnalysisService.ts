import { Types } from "mongoose";
import Session from "../../models/Session";
import SleepStageEpoch from "../../models/SleepStageEpoch";
import SessionAnalysis from "../../models/SessionAnalysis";

type SleepStage = "AWAKE" | "LIGHT" | "DEEP" | "REM";

interface IConfusionMatrix {
  AWAKE: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  LIGHT: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  DEEP: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  REM: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
}

interface ISleepStageStats {
  totalSleepSec: number;
  deepSec: number;
  remSec: number;
  lightSec: number;
  awakeSec: number;
}

/**
 * SleepAnalysisService
 * Computes session-level sleep analysis metrics
 */
export class SleepAnalysisService {
  /**
   * Analyze a sleep session
   * This is called after epochs have been ingested
   */
  static async analyzeSession(sessionId: Types.ObjectId | string): Promise<void> {
    try {
      console.log(`[SleepAnalysisService] Analyzing session: ${sessionId}`);

      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.metric !== "Sleep") {
        throw new Error(`Session ${sessionId} is not a sleep session`);
      }

      // Fetch Luna epochs
      const lunaEpochs = await SleepStageEpoch.find({
        "meta.sessionId": sessionId,
        "meta.deviceType": "luna",
      }).sort({ timestamp: 1 });
      console.log(`[SleepAnalysisService] 📊 Found ${lunaEpochs.length} Luna epochs`);

      // Fetch benchmark device epochs (if available)
      const benchmarkDeviceType = session.benchmarkDeviceType;
      let benchmarkEpochs: any[] = [];
      if (benchmarkDeviceType) {
        benchmarkEpochs = await SleepStageEpoch.find({
          "meta.sessionId": sessionId,
          "meta.deviceType": benchmarkDeviceType,
        }).sort({ timestamp: 1 });
        console.log(`[SleepAnalysisService] 📊 Found ${benchmarkEpochs.length} ${benchmarkDeviceType} epochs`);
      }

      // Calculate Luna stats
      const lunaStats = this.calculateSleepStats(lunaEpochs);

      // Calculate benchmark stats (if available)
      let benchmarkStats: ISleepStageStats | null = null;
      if (benchmarkEpochs.length > 0) {
        benchmarkStats = this.calculateSleepStats(benchmarkEpochs);
      }

      // Calculate comparison metrics if both devices present
      let confusionMatrix: IConfusionMatrix | undefined;
      let epochAccuracyPercent: number | undefined;
      let kappaScore: number | undefined;

      if (benchmarkEpochs.length > 0 && lunaEpochs.length > 0) {
        confusionMatrix = this.buildConfusionMatrix(lunaEpochs, benchmarkEpochs);
        epochAccuracyPercent = this.calculateAccuracy(confusionMatrix);
        kappaScore = this.calculateKappa(confusionMatrix);
        console.log(`[SleepAnalysisService] ✅ Accuracy: ${epochAccuracyPercent.toFixed(1)}%, Kappa: ${kappaScore.toFixed(3)}`);
      }

      // Calculate sleep efficiency (if we have onset/wake times)
      const sleepEfficiency = this.calculateSleepEfficiency(lunaStats);

      // Extract sleep onset and wake times
      const lunaSleepOnsetTime = this.findSleepOnsetTime(lunaEpochs);
      const lunaFinalWakeTime = this.findFinalWakeTime(lunaEpochs);
      
      let benchmarkSleepOnsetTime: Date | undefined;
      let benchmarkFinalWakeTime: Date | undefined;
      if (benchmarkEpochs.length > 0) {
        benchmarkSleepOnsetTime = this.findSleepOnsetTime(benchmarkEpochs);
        benchmarkFinalWakeTime = this.findFinalWakeTime(benchmarkEpochs);
      }

      // Build sleepStats object
      const sleepStats = {
        sleepScore: undefined, // TODO: Extract from Luna metadata
        sleepEfficiency,
        totalSleepLunaSec: lunaStats.totalSleepSec,
        totalSleepBenchmarkSec: benchmarkStats?.totalSleepSec,
        totalSleepDiffSec: benchmarkStats
          ? lunaStats.totalSleepSec - benchmarkStats.totalSleepSec
          : undefined,
        deepLunaSec: lunaStats.deepSec,
        deepBenchmarkSec: benchmarkStats?.deepSec,
        deepDiffSec: benchmarkStats ? lunaStats.deepSec - benchmarkStats.deepSec : undefined,
        remLunaSec: lunaStats.remSec,
        remBenchmarkSec: benchmarkStats?.remSec,
        remDiffSec: benchmarkStats ? lunaStats.remSec - benchmarkStats.remSec : undefined,
        lightLunaSec: lunaStats.lightSec,
        lightBenchmarkSec: benchmarkStats?.lightSec,
        lightDiffSec: benchmarkStats ? lunaStats.lightSec - benchmarkStats.lightSec : undefined,
        awakeLunaSec: lunaStats.awakeSec,
        awakeBenchmarkSec: benchmarkStats?.awakeSec,
        awakeDiffSec: benchmarkStats ? lunaStats.awakeSec - benchmarkStats.awakeSec : undefined,
        lunaSleepOnsetTime,
        lunaFinalWakeTime,
        benchmarkSleepOnsetTime,
        benchmarkFinalWakeTime,
        epochAccuracyPercent,
        kappaScore,
        confusionMatrix,
      };

      // Save or update SessionAnalysis
      await SessionAnalysis.findOneAndUpdate(
        { sessionId },
        {
          sessionId,
          userId: session.userId,
          activityType: session.activityType,
          metric: session.metric,
          startTime: session.startTime,
          endTime: session.endTime,
          sleepStats,
          isValid: session.isValid,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[SleepAnalysisService] Session analysis completed for ${sessionId}`);
    } catch (error) {
      console.error(`[SleepAnalysisService] Error analyzing session:`, error);
      throw error;
    }
  }

  /**
   * Calculate sleep stage durations
   */
  private static calculateSleepStats(epochs: any[]): ISleepStageStats {
    const stats: ISleepStageStats = {
      totalSleepSec: 0,
      deepSec: 0,
      remSec: 0,
      lightSec: 0,
      awakeSec: 0,
    };

    epochs.forEach((epoch) => {
      const duration = epoch.durationSec;
      
      switch (epoch.stage) {
        case "DEEP":
          stats.deepSec += duration;
          stats.totalSleepSec += duration;
          break;
        case "REM":
          stats.remSec += duration;
          stats.totalSleepSec += duration;
          break;
        case "LIGHT":
          stats.lightSec += duration;
          stats.totalSleepSec += duration;
          break;
        case "AWAKE":
          stats.awakeSec += duration;
          break;
      }
    });

    return stats;
  }

  /**
   * Build confusion matrix (Benchmark = truth, Luna = prediction)
   * Aligns epochs by timestamp
   */
  private static buildConfusionMatrix(
    lunaEpochs: any[],
    benchmarkEpochs: any[]
  ): IConfusionMatrix {
    const matrix: IConfusionMatrix = {
      AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
      LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
      DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
      REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
    };

    // Create timestamp maps for quick lookup
    const benchmarkMap = new Map<number, SleepStage>();
    benchmarkEpochs.forEach((epoch) => {
      const ts = new Date(epoch.timestamp).getTime();
      benchmarkMap.set(ts, epoch.stage);
    });
    console.log(`[SleepAnalysisService] 🗺️  Benchmark timestamp map created with ${benchmarkMap.size} entries`);
    
    // Log first few timestamps for debugging
    if (lunaEpochs.length > 0 && benchmarkEpochs.length > 0) {
      console.log(`[SleepAnalysisService] 🕐 Sample Luna timestamps (first 3):`, 
        lunaEpochs.slice(0, 3).map(e => new Date(e.timestamp).toISOString()));
      console.log(`[SleepAnalysisService] 🕐 Sample Benchmark timestamps (first 3):`, 
        benchmarkEpochs.slice(0, 3).map(e => new Date(e.timestamp).toISOString()));
    }

    // Match Luna epochs with benchmark epochs
    let matchedCount = 0;
    lunaEpochs.forEach((lunaEpoch) => {
      const ts = new Date(lunaEpoch.timestamp).getTime();
      const benchmarkStage = benchmarkMap.get(ts);

      if (benchmarkStage) {
        const lunaStage = lunaEpoch.stage as SleepStage;
        matrix[benchmarkStage][lunaStage]++;
        matchedCount++;
      }
    });
    
    console.log(`[SleepAnalysisService] 🎯 Matched ${matchedCount} out of ${lunaEpochs.length} Luna epochs`);
    if (matchedCount === 0 && lunaEpochs.length > 0 && benchmarkEpochs.length > 0) {
      console.warn(`[SleepAnalysisService] ⚠️  NO MATCHES FOUND! Timestamps may not align.`);
    }

    return matrix;
  }

  /**
   * Calculate epoch accuracy percentage
   */
  private static calculateAccuracy(matrix: IConfusionMatrix): number {
    let correct = 0;
    let total = 0;

    (Object.keys(matrix) as SleepStage[]).forEach((truthStage) => {
      (Object.keys(matrix[truthStage]) as SleepStage[]).forEach((predStage) => {
        const count = matrix[truthStage][predStage];
        total += count;
        if (truthStage === predStage) {
          correct += count;
        }
      });
    });

    return total > 0 ? (correct / total) * 100 : 0;
  }

  /**
   * Calculate Cohen's Kappa score
   */
  private static calculateKappa(matrix: IConfusionMatrix): number {
    const stages: SleepStage[] = ["AWAKE", "LIGHT", "DEEP", "REM"];

    // Total observations
    let total = 0;
    stages.forEach((truthStage) => {
      stages.forEach((predStage) => {
        total += matrix[truthStage][predStage];
      });
    });

    if (total === 0) {
      return 0;
    }

    // Observed agreement (diagonal sum / total)
    let observedAgreement = 0;
    stages.forEach((stage) => {
      observedAgreement += matrix[stage][stage];
    });
    const po = observedAgreement / total;

    // Expected agreement
    let expectedAgreement = 0;
    stages.forEach((stage) => {
      // Truth marginal
      let truthSum = 0;
      stages.forEach((predStage) => {
        truthSum += matrix[stage][predStage];
      });

      // Predicted marginal
      let predSum = 0;
      stages.forEach((truthStage) => {
        predSum += matrix[truthStage][stage];
      });

      expectedAgreement += (truthSum * predSum) / (total * total);
    });

    const pe = expectedAgreement;
    const kappa = (po - pe) / (1 - pe);
    return Math.max(0, Math.min(1, kappa)); // Clamp between 0 and 1
  }

  /**
   * Calculate sleep efficiency
   * Efficiency = Total Sleep Time / Time in Bed * 100
   */
  private static calculateSleepEfficiency(stats: ISleepStageStats): number | undefined {
    const timeInBed = stats.totalSleepSec + stats.awakeSec;
    if (timeInBed === 0) return undefined;

    return (stats.totalSleepSec / timeInBed) * 100;
  }

  /**
   * Calculate stage-wise sensitivity and specificity
   * Useful for admin views
   */
  static calculateStageSensitivity(
    matrix: IConfusionMatrix,
    stage: SleepStage
  ): number {
    const stages: SleepStage[] = ["AWAKE", "LIGHT", "DEEP", "REM"];

    // True positives
    const tp = matrix[stage][stage];

    // False negatives
    let fn = 0;
    stages.forEach((predStage) => {
      if (predStage !== stage) {
        fn += matrix[stage][predStage];
      }
    });

    const total = tp + fn;
    return total > 0 ? (tp / total) * 100 : 0;
  }

  static calculateStageSpecificity(
    matrix: IConfusionMatrix,
    stage: SleepStage
  ): number {
    const stages: SleepStage[] = ["AWAKE", "LIGHT", "DEEP", "REM"];

    // True negatives
    let tn = 0;
    stages.forEach((truthStage) => {
      if (truthStage !== stage) {
        stages.forEach((predStage) => {
          if (predStage !== stage) {
            tn += matrix[truthStage][predStage];
          }
        });
      }
    });

    // False positives
    let fp = 0;
    stages.forEach((truthStage) => {
      if (truthStage !== stage) {
        fp += matrix[truthStage][stage];
      }
    });

    const total = tn + fp;
    return total > 0 ? (tn / total) * 100 : 0;
  }

  /**
   * Find sleep onset time (first non-AWAKE epoch)
   */
  private static findSleepOnsetTime(epochs: any[]): Date | undefined {
    const firstSleepEpoch = epochs.find((epoch) => epoch.stage !== "AWAKE");
    return firstSleepEpoch ? new Date(firstSleepEpoch.timestamp) : undefined;
  }

  /**
   * Find final wake time (last epoch timestamp + duration, or last non-AWAKE epoch end)
   */
  private static findFinalWakeTime(epochs: any[]): Date | undefined {
    if (epochs.length === 0) return undefined;

    // Find the last non-AWAKE epoch
    for (let i = epochs.length - 1; i >= 0; i--) {
      if (epochs[i].stage !== "AWAKE") {
        const lastSleepEpoch = epochs[i];
        const timestamp = new Date(lastSleepEpoch.timestamp);
        const durationMs = (lastSleepEpoch.durationSec || 0) * 1000;
        return new Date(timestamp.getTime() + durationMs);
      }
    }

    return undefined;
  }
}
