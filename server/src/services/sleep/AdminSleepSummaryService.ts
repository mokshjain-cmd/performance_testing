import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import SleepStageEpoch from "../../models/SleepStageEpoch";
import { SleepAnalysisService } from "./SleepAnalysisService";

type SleepStage = "AWAKE" | "LIGHT" | "DEEP" | "REM";

interface IConfusionMatrix {
  AWAKE: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  LIGHT: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  DEEP: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
  REM: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
}

interface IAdminGlobalSummary {
  totalSessions: number;
  totalUsers: number;
  
  // Population metrics
  totalSleepTimeSec: number;  // Total sleep time across all sessions
  avgTotalSleepTimeSec: number;
  avgDeepPercent: number;
  avgRemPercent: number;
  
  // Validation metrics
  avgEpochAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  avgTotalSleepBiasSec: number;
  
  // Stage sensitivity
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
  
  latestFirmwareVersion: string;
}

interface IFirmwareComparison {
  firmwareVersion: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgTotalSleepBiasSec: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface IBenchmarkComparison {
  benchmarkDevice: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface IAdminSessionSummary {
  sessionId: string;
  userId: string;
  userName?: string;
  date: Date;
  firmwareVersion?: string;
  benchmarkDeviceType?: string;
  
  // Session timing
  sessionStartTime: Date;
  sessionEndTime: Date;
  
  // Luna Sleep Metrics
  luna: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    deepSec: number;
    lightSec: number;
    remSec: number;
    awakeSec: number;
    sleepEfficiencyPercent: number;
    sleepOnsetTime?: Date;
    finalWakeTime?: Date;
  };
  
  // Benchmark Sleep Metrics (if available)
  benchmark?: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    deepSec: number;
    lightSec: number;
    remSec: number;
    awakeSec: number;
    sleepOnsetTime?: Date;
    finalWakeTime?: Date;
  };
  
  // Validation metrics
  accuracyPercent: number;
  kappaScore: number;
  deepBiasSec: number;
  remBiasSec: number;
  totalSleepBiasSec: number;
  
  // Stage sensitivity/specificity
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
  stageSpecificity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
  
  confusionMatrix: IConfusionMatrix;
}

interface IAdminUserSummary {
  userId: string;
  totalSessions: number;
  avgTotalSleepTimeSec: number;
  avgTimeInBedSec: number;
  avgDeepSec: number;
  avgLightSec: number;
  avgRemSec: number;
  avgAwakeSec: number;
  avgDeepPercent: number;
  avgLightPercent: number;
  avgRemPercent: number;
  avgAwakePercent: number;
  avgSleepEfficiencyPercent: number;
  avgEpochAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  avgTotalSleepBiasSec: number;
  bestSession?: {
    sessionId: string;
    sessionName: string;
    accuracyPercent: number;
    date: Date;
  };
  worstSession?: {
    sessionId: string;
    sessionName: string;
    accuracyPercent: number;
    date: Date;
  };
}

interface IAccuracyTrend {
  date: Date;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgBiasSec: number;
  sessionCount: number;
}

/**
 * AdminSleepSummaryService
 * Provides admin-facing analytics and validation metrics
 */
export class AdminSleepSummaryService {
  /**
   * 2A) Admin Global Summary
   * All users, all sessions, optionally filtered by latest firmware
   */
  static async getGlobalSummary(
    latestFirmwareOnly: boolean = false
  ): Promise<IAdminGlobalSummary> {
    try {
      let firmwareFilter = {};
      
      if (latestFirmwareOnly) {
        // TODO: Determine latest firmware version
        // For now, we'll skip this filter
        console.log("[AdminSleepSummaryService] Latest firmware filter not yet implemented");
      }

      // Fetch all valid sleep sessions
      const sessions = await Session.find({
        metric: "Sleep",
        isValid: true,
        ...firmwareFilter,
      });

      const sessionIds = sessions.map((s) => s._id);
      
      // Get unique users
      const uniqueUsers = new Set(sessions.map((s) => s.userId.toString()));

      // Fetch all analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
      });

      if (analyses.length === 0) {
        throw new Error("No sleep analysis data available");
      }

      // Aggregate metrics
      let totalSleepSum = 0;
      let deepSum = 0;
      let remSum = 0;
      let accuracySum = 0;
      let kappaSum = 0;
      let deepBiasSum = 0;
      let remBiasSum = 0;
      let totalSleepBiasSum = 0;
      
      let validationCount = 0; // Count sessions with comparison data
      
      // For stage sensitivity calculation
      const aggregatedMatrix: IConfusionMatrix = {
        AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
      };

      analyses.forEach((analysis) => {
        const sleepStats = analysis.sleepStats;
        if (!sleepStats) return;

        const totalSleep = sleepStats.totalSleepLunaSec || 0;
        const deep = sleepStats.deepLunaSec || 0;
        const rem = sleepStats.remLunaSec || 0;

        totalSleepSum += totalSleep;
        deepSum += deep;
        remSum += rem;

        // If comparison data available
        if (sleepStats.epochAccuracyPercent !== undefined) {
          validationCount++;
          accuracySum += sleepStats.epochAccuracyPercent;
          kappaSum += sleepStats.kappaScore || 0;
          deepBiasSum += sleepStats.deepDiffSec || 0;
          remBiasSum += sleepStats.remDiffSec || 0;
          totalSleepBiasSum += sleepStats.totalSleepDiffSec || 0;

          // Aggregate confusion matrix
          if (sleepStats.confusionMatrix) {
            const cm = sleepStats.confusionMatrix;
            (Object.keys(cm) as SleepStage[]).forEach((truthStage) => {
              (Object.keys(cm[truthStage]) as SleepStage[]).forEach((predStage) => {
                aggregatedMatrix[truthStage][predStage] += cm[truthStage][predStage];
              });
            });
          }
        }
      });

      const count = analyses.length;

      // Calculate stage sensitivities from aggregated matrix
      const stageSensitivity = {
        AWAKE: SleepAnalysisService.calculateStageSensitivity(aggregatedMatrix, "AWAKE"),
        LIGHT: SleepAnalysisService.calculateStageSensitivity(aggregatedMatrix, "LIGHT"),
        DEEP: SleepAnalysisService.calculateStageSensitivity(aggregatedMatrix, "DEEP"),
        REM: SleepAnalysisService.calculateStageSensitivity(aggregatedMatrix, "REM"),
      };

      // Get latest firmware version
      const latestFirmware = sessions
        .map(s => s.devices.find((d: any) => d.deviceType === "luna")?.firmwareVersion)
        .filter(Boolean)
        .sort()
        .pop() || "unknown";

      return {
        totalSessions: count,
        totalUsers: uniqueUsers.size,
        totalSleepTimeSec: totalSleepSum,
        avgTotalSleepTimeSec: totalSleepSum / count,
        avgDeepPercent: (deepSum / totalSleepSum) * 100,
        avgRemPercent: (remSum / totalSleepSum) * 100,
        avgEpochAccuracyPercent: validationCount > 0 ? accuracySum / validationCount : 0,
        avgKappaScore: validationCount > 0 ? kappaSum / validationCount : 0,
        avgDeepBiasSec: validationCount > 0 ? deepBiasSum / validationCount : 0,
        avgRemBiasSec: validationCount > 0 ? remBiasSum / validationCount : 0,
        avgTotalSleepBiasSec: validationCount > 0 ? totalSleepBiasSum / validationCount : 0,
        stageSensitivity,
        latestFirmwareVersion: latestFirmware,
      };
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting global summary:", error);
      throw error;
    }
  }

  /**
   * 2B) Firmware-Wise Comparison
   */
  static async getFirmwareComparison(): Promise<IFirmwareComparison[]> {
    try {
      // Fetch all sleep sessions
      const sessions = await Session.find({
        metric: "Sleep",
        isValid: true,
      });

      // Group by firmware version
      const firmwareGroups = new Map<string, Types.ObjectId[]>();
      
      sessions.forEach((session) => {
        const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
        const firmware = lunaDevice?.firmwareVersion || "unknown";
        
        if (!firmwareGroups.has(firmware)) {
          firmwareGroups.set(firmware, []);
        }
        firmwareGroups.get(firmware)!.push(session._id);
      });

      const results: IFirmwareComparison[] = [];

      // Calculate metrics for each firmware version
      for (const [firmware, sessionIds] of firmwareGroups.entries()) {
        const analyses = await SessionAnalysis.find({
          sessionId: { $in: sessionIds },
          isValid: true,
        });

        if (analyses.length === 0) continue;

        let accuracySum = 0;
        let kappaSum = 0;
        let totalSleepBiasSum = 0;
        let deepBiasSum = 0;
        let remBiasSum = 0;
        let validationCount = 0;

        // Aggregate confusion matrix for stage-wise sensitivity
        const aggregatedCM: IConfusionMatrix = {
          AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        };

        analyses.forEach((analysis) => {
          const sleepStats = analysis.sleepStats;
          if (!sleepStats) return;

          if (sleepStats.epochAccuracyPercent !== undefined) {
            validationCount++;
            accuracySum += sleepStats.epochAccuracyPercent;
            kappaSum += sleepStats.kappaScore || 0;
            totalSleepBiasSum += sleepStats.totalSleepDiffSec || 0;
            deepBiasSum += sleepStats.deepDiffSec || 0;
            remBiasSum += sleepStats.remDiffSec || 0;

            // Aggregate confusion matrix
            if (sleepStats.confusionMatrix) {
              const cm = sleepStats.confusionMatrix;
              (Object.keys(aggregatedCM) as SleepStage[]).forEach((trueStage) => {
                (Object.keys(aggregatedCM[trueStage]) as SleepStage[]).forEach((predStage) => {
                  aggregatedCM[trueStage][predStage] += cm[trueStage]?.[predStage] || 0;
                });
              });
            }
          }
        });

        if (validationCount > 0) {
          // Calculate stage-wise sensitivity from aggregated confusion matrix
          const stageSensitivity = {
            AWAKE: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "AWAKE"),
            LIGHT: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "LIGHT"),
            DEEP: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "DEEP"),
            REM: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "REM"),
          };

          results.push({
            firmwareVersion: firmware,
            avgAccuracyPercent: accuracySum / validationCount,
            avgKappaScore: kappaSum / validationCount,
            avgTotalSleepBiasSec: totalSleepBiasSum / validationCount,
            avgDeepBiasSec: deepBiasSum / validationCount,
            avgRemBiasSec: remBiasSum / validationCount,
            totalSessions: validationCount,
            stageSensitivity,
          });
        }
      }

      return results.sort((a, b) => b.avgAccuracyPercent - a.avgAccuracyPercent);
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting firmware comparison:", error);
      throw error;
    }
  }

  /**
   * 2C) Benchmark Device Comparison
   */
  static async getBenchmarkComparison(): Promise<IBenchmarkComparison[]> {
    try {
      // Fetch all sleep sessions
      const sessions = await Session.find({
        metric: "Sleep",
        isValid: true,
      });

      // Group by benchmark device
      const benchmarkGroups = new Map<string, Types.ObjectId[]>();
      
      sessions.forEach((session) => {
        const benchmark = session.benchmarkDeviceType || "none";
        
        if (!benchmarkGroups.has(benchmark)) {
          benchmarkGroups.set(benchmark, []);
        }
        benchmarkGroups.get(benchmark)!.push(session._id);
      });

      const results: IBenchmarkComparison[] = [];

      // Calculate metrics for each benchmark device
      for (const [benchmark, sessionIds] of benchmarkGroups.entries()) {
        if (benchmark === "none") continue;

        const analyses = await SessionAnalysis.find({
          sessionId: { $in: sessionIds },
          isValid: true,
        });

        if (analyses.length === 0) continue;

        let accuracySum = 0;
        let kappaSum = 0;
        let deepBiasSum = 0;
        let remBiasSum = 0;
        let validationCount = 0;

        // Aggregate confusion matrix for stage-wise sensitivity
        const aggregatedCM: IConfusionMatrix = {
          AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        };

        analyses.forEach((analysis) => {
          const sleepStats = analysis.sleepStats;
          if (!sleepStats) return;

          if (sleepStats.epochAccuracyPercent !== undefined) {
            validationCount++;
            accuracySum += sleepStats.epochAccuracyPercent;
            kappaSum += sleepStats.kappaScore || 0;
            deepBiasSum += sleepStats.deepDiffSec || 0;
            remBiasSum += sleepStats.remDiffSec || 0;

            // Aggregate confusion matrix
            if (sleepStats.confusionMatrix) {
              const cm = sleepStats.confusionMatrix;
              (Object.keys(aggregatedCM) as SleepStage[]).forEach((trueStage) => {
                (Object.keys(aggregatedCM[trueStage]) as SleepStage[]).forEach((predStage) => {
                  aggregatedCM[trueStage][predStage] += cm[trueStage]?.[predStage] || 0;
                });
              });
            }
          }
        });

        if (validationCount > 0) {
          // Calculate stage-wise sensitivity from aggregated confusion matrix
          const stageSensitivity = {
            AWAKE: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "AWAKE"),
            LIGHT: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "LIGHT"),
            DEEP: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "DEEP"),
            REM: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "REM"),
          };

          results.push({
            benchmarkDevice: benchmark,
            avgAccuracyPercent: accuracySum / validationCount,
            avgKappaScore: kappaSum / validationCount,
            avgDeepBiasSec: deepBiasSum / validationCount,
            avgRemBiasSec: remBiasSum / validationCount,
            totalSessions: validationCount,
            stageSensitivity,
          });
        }
      }

      return results.sort((a, b) => b.avgAccuracyPercent - a.avgAccuracyPercent);
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting benchmark comparison:", error);
      throw error;
    }
  }

  /**
   * Get firmware comparison for a specific user
   */
  static async getUserFirmwareComparison(userId: Types.ObjectId | string): Promise<IFirmwareComparison[]> {
    try {
      // Fetch all sleep sessions for this user
      const sessions = await Session.find({
        userId,
        metric: "Sleep",
        isValid: true,
      });

      if (sessions.length === 0) {
        return [];
      }

      // Group by firmware version
      const firmwareGroups = new Map<string, Types.ObjectId[]>();
      
      sessions.forEach((session) => {
        const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
        const firmware = lunaDevice?.firmwareVersion || "unknown";
        
        if (!firmwareGroups.has(firmware)) {
          firmwareGroups.set(firmware, []);
        }
        firmwareGroups.get(firmware)!.push(session._id);
      });

      const results: IFirmwareComparison[] = [];

      // Calculate metrics for each firmware version
      for (const [firmware, sessionIds] of firmwareGroups.entries()) {
        const analyses = await SessionAnalysis.find({
          sessionId: { $in: sessionIds },
          isValid: true,
        });

        if (analyses.length === 0) continue;

        let accuracySum = 0;
        let kappaSum = 0;
        let totalSleepBiasSum = 0;
        let deepBiasSum = 0;
        let remBiasSum = 0;
        let validationCount = 0;

        // Aggregate confusion matrix for stage-wise sensitivity
        const aggregatedCM: IConfusionMatrix = {
          AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        };

        analyses.forEach((analysis) => {
          const sleepStats = analysis.sleepStats;
          if (!sleepStats) return;

          if (sleepStats.epochAccuracyPercent !== undefined) {
            validationCount++;
            accuracySum += sleepStats.epochAccuracyPercent;
            kappaSum += sleepStats.kappaScore || 0;
            totalSleepBiasSum += sleepStats.totalSleepDiffSec || 0;
            deepBiasSum += sleepStats.deepDiffSec || 0;
            remBiasSum += sleepStats.remDiffSec || 0;

            // Aggregate confusion matrix
            if (sleepStats.confusionMatrix) {
              const cm = sleepStats.confusionMatrix;
              (Object.keys(aggregatedCM) as SleepStage[]).forEach((trueStage) => {
                (Object.keys(aggregatedCM[trueStage]) as SleepStage[]).forEach((predStage) => {
                  aggregatedCM[trueStage][predStage] += cm[trueStage]?.[predStage] || 0;
                });
              });
            }
          }
        });

        if (validationCount > 0) {
          // Calculate stage-wise sensitivity from aggregated confusion matrix
          const stageSensitivity = {
            AWAKE: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "AWAKE"),
            LIGHT: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "LIGHT"),
            DEEP: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "DEEP"),
            REM: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "REM"),
          };

          results.push({
            firmwareVersion: firmware,
            avgAccuracyPercent: accuracySum / validationCount,
            avgKappaScore: kappaSum / validationCount,
            avgTotalSleepBiasSec: totalSleepBiasSum / validationCount,
            avgDeepBiasSec: deepBiasSum / validationCount,
            avgRemBiasSec: remBiasSum / validationCount,
            totalSessions: validationCount,
            stageSensitivity,
          });
        }
      }

      return results.sort((a, b) => b.avgAccuracyPercent - a.avgAccuracyPercent);
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting user firmware comparison:", error);
      throw error;
    }
  }

  /**
   * Get benchmark comparison for a specific user
   */
  static async getUserBenchmarkComparison(userId: Types.ObjectId | string): Promise<IBenchmarkComparison[]> {
    try {
      // Fetch all sleep sessions for this user
      const sessions = await Session.find({
        userId,
        metric: "Sleep",
        isValid: true,
      });

      if (sessions.length === 0) {
        return [];
      }

      // Group by benchmark device
      const benchmarkGroups = new Map<string, Types.ObjectId[]>();
      
      sessions.forEach((session) => {
        const benchmark = session.benchmarkDeviceType || "none";
        
        if (!benchmarkGroups.has(benchmark)) {
          benchmarkGroups.set(benchmark, []);
        }
        benchmarkGroups.get(benchmark)!.push(session._id);
      });

      const results: IBenchmarkComparison[] = [];

      // Calculate metrics for each benchmark device
      for (const [benchmark, sessionIds] of benchmarkGroups.entries()) {
        if (benchmark === "none") continue;

        const analyses = await SessionAnalysis.find({
          sessionId: { $in: sessionIds },
          isValid: true,
        });

        if (analyses.length === 0) continue;

        let accuracySum = 0;
        let kappaSum = 0;
        let deepBiasSum = 0;
        let remBiasSum = 0;
        let validationCount = 0;

        // Aggregate confusion matrix for stage-wise sensitivity
        const aggregatedCM: IConfusionMatrix = {
          AWAKE: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          LIGHT: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          DEEP: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
          REM: { AWAKE: 0, LIGHT: 0, DEEP: 0, REM: 0 },
        };

        analyses.forEach((analysis) => {
          const sleepStats = analysis.sleepStats;
          if (!sleepStats) return;

          if (sleepStats.epochAccuracyPercent !== undefined) {
            validationCount++;
            accuracySum += sleepStats.epochAccuracyPercent;
            kappaSum += sleepStats.kappaScore || 0;
            deepBiasSum += sleepStats.deepDiffSec || 0;
            remBiasSum += sleepStats.remDiffSec || 0;

            // Aggregate confusion matrix
            if (sleepStats.confusionMatrix) {
              const cm = sleepStats.confusionMatrix;
              (Object.keys(aggregatedCM) as SleepStage[]).forEach((trueStage) => {
                (Object.keys(aggregatedCM[trueStage]) as SleepStage[]).forEach((predStage) => {
                  aggregatedCM[trueStage][predStage] += cm[trueStage]?.[predStage] || 0;
                });
              });
            }
          }
        });

        if (validationCount > 0) {
          // Calculate stage-wise sensitivity from aggregated confusion matrix
          const stageSensitivity = {
            AWAKE: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "AWAKE"),
            LIGHT: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "LIGHT"),
            DEEP: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "DEEP"),
            REM: SleepAnalysisService.calculateStageSensitivity(aggregatedCM, "REM"),
          };

          results.push({
            benchmarkDevice: benchmark,
            avgAccuracyPercent: accuracySum / validationCount,
            avgKappaScore: kappaSum / validationCount,
            avgDeepBiasSec: deepBiasSum / validationCount,
            avgRemBiasSec: remBiasSum / validationCount,
            totalSessions: validationCount,
            stageSensitivity,
          });
        }
      }

      return results.sort((a, b) => b.avgAccuracyPercent - a.avgAccuracyPercent);
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting user benchmark comparison:", error);
      throw error;
    }
  }

  /**
   * 2D) Admin User Summary (single user with validation layer)
   */
  static async getAdminUserSummary(userId: Types.ObjectId | string) {
    try {
      const sessions = await Session.find({
        userId,
        metric: "Sleep",
        isValid: true,
      });

      const sessionIds = sessions.map((s) => s._id);
      
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
      });

      if (analyses.length === 0) {
        throw new Error("No sleep analysis data available for this user");
      }

      // Calculate aggregated metrics
      let totalSleepSum = 0;
      let timeInBedSum = 0;
      let deepSum = 0;
      let lightSum = 0;
      let remSum = 0;
      let awakeSum = 0;
      let efficiencySum = 0;
      let accuracySum = 0;
      let kappaSum = 0;
      let deepBiasSum = 0;
      let remBiasSum = 0;
      let totalSleepBiasSum = 0;
      let validationCount = 0;

      // For best/worst sessions
      let bestSession: any = null;
      let worstSession: any = null;
      let bestAccuracy = -1;
      let worstAccuracy = 101;

      analyses.forEach((analysis) => {
        const sleepStats = analysis.sleepStats;
        if (!sleepStats) return;

        const totalSleep = sleepStats.totalSleepLunaSec || 0;
        const deep = sleepStats.deepLunaSec || 0;
        const rem = sleepStats.remLunaSec || 0;
        const light = sleepStats.lightLunaSec || 0;
        const awake = sleepStats.awakeLunaSec || 0;
        const efficiency = sleepStats.sleepEfficiency || 0;
        const timeInBed = totalSleep + awake;

        totalSleepSum += totalSleep;
        timeInBedSum += timeInBed;
        deepSum += deep;
        lightSum += light;
        remSum += rem;
        awakeSum += awake;
        efficiencySum += efficiency;

        if (sleepStats.epochAccuracyPercent !== undefined) {
          validationCount++;
          const accuracy = sleepStats.epochAccuracyPercent;
          accuracySum += accuracy;
          kappaSum += sleepStats.kappaScore || 0;
          deepBiasSum += sleepStats.deepDiffSec || 0;
          remBiasSum += sleepStats.remDiffSec || 0;
          totalSleepBiasSum += sleepStats.totalSleepDiffSec || 0;

          // Track best/worst sessions
          const session = sessions.find(s => s._id.toString() === analysis.sessionId.toString());
          if (session) {
            if (accuracy > bestAccuracy) {
              bestAccuracy = accuracy;
              bestSession = {
                sessionId: session._id.toString(),
                sessionName: session.name || 'Unknown',
                accuracyPercent: accuracy,
                date: session.startTime,
              };
            }
            if (accuracy < worstAccuracy) {
              worstAccuracy = accuracy;
              worstSession = {
                sessionId: session._id.toString(),
                sessionName: session.name || 'Unknown',
                accuracyPercent: accuracy,
                date: session.startTime,
              };
            }
          }
        }
      });

      const count = analyses.length;
      const totalStages = totalSleepSum + awakeSum;

      return {
        userId: userId.toString(),
        totalSessions: count,
        avgTotalSleepTimeSec: totalSleepSum / count,
        avgTimeInBedSec: timeInBedSum / count,
        avgDeepSec: deepSum / count,
        avgLightSec: lightSum / count,
        avgRemSec: remSum / count,
        avgAwakeSec: awakeSum / count,
        avgDeepPercent: totalStages > 0 ? (deepSum / totalStages) * 100 : 0,
        avgLightPercent: totalStages > 0 ? (lightSum / totalStages) * 100 : 0,
        avgRemPercent: totalStages > 0 ? (remSum / totalStages) * 100 : 0,
        avgAwakePercent: totalStages > 0 ? (awakeSum / totalStages) * 100 : 0,
        avgSleepEfficiencyPercent: efficiencySum / count,
        avgEpochAccuracyPercent: validationCount > 0 ? accuracySum / validationCount : 0,
        avgKappaScore: validationCount > 0 ? kappaSum / validationCount : 0,
        avgDeepBiasSec: validationCount > 0 ? deepBiasSum / validationCount : 0,
        avgRemBiasSec: validationCount > 0 ? remBiasSum / validationCount : 0,
        avgTotalSleepBiasSec: validationCount > 0 ? totalSleepBiasSum / validationCount : 0,
        bestSession,
        worstSession,
      };
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting admin user summary:", error);
      throw error;
    }
  }

  /**
   * 2E) Admin Session Level Summary (most technical view)
   */
  static async getAdminSessionSummary(sessionId: Types.ObjectId | string): Promise<IAdminSessionSummary> {
    try {
      const session = await Session.findById(sessionId).populate("userId");
      if (!session) {
        throw new Error("Session not found");
      }

      const analysis = await SessionAnalysis.findOne({ sessionId });
      if (!analysis || !analysis.sleepStats) {
        throw new Error("Sleep analysis not available");
      }

      const sleepStats = analysis.sleepStats;

      if (!sleepStats.confusionMatrix) {
        throw new Error("Confusion matrix not available for this session");
      }

      const cm = sleepStats.confusionMatrix;

      // Calculate sensitivity and specificity for each stage
      const stageSensitivity = {
        AWAKE: SleepAnalysisService.calculateStageSensitivity(cm, "AWAKE"),
        LIGHT: SleepAnalysisService.calculateStageSensitivity(cm, "LIGHT"),
        DEEP: SleepAnalysisService.calculateStageSensitivity(cm, "DEEP"),
        REM: SleepAnalysisService.calculateStageSensitivity(cm, "REM"),
      };

      const stageSpecificity = {
        AWAKE: SleepAnalysisService.calculateStageSpecificity(cm, "AWAKE"),
        LIGHT: SleepAnalysisService.calculateStageSpecificity(cm, "LIGHT"),
        DEEP: SleepAnalysisService.calculateStageSpecificity(cm, "DEEP"),
        REM: SleepAnalysisService.calculateStageSpecificity(cm, "REM"),
      };

      // Get firmware version
      const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
      const firmwareVersion = lunaDevice?.firmwareVersion;
      const benchmarkDeviceType = session.benchmarkDeviceType;

      // Build Luna metrics
      const lunaMetrics = {
        totalSleepTimeSec: sleepStats.totalSleepLunaSec || 0,
        timeInBedSec: (sleepStats.totalSleepLunaSec || 0) + (sleepStats.awakeLunaSec || 0),
        deepSec: sleepStats.deepLunaSec || 0,
        lightSec: sleepStats.lightLunaSec || 0,
        remSec: sleepStats.remLunaSec || 0,
        awakeSec: sleepStats.awakeLunaSec || 0,
        sleepEfficiencyPercent: sleepStats.sleepEfficiency || 0,
        sleepOnsetTime: sleepStats.lunaSleepOnsetTime,
        finalWakeTime: sleepStats.lunaFinalWakeTime,
      };

      // Build Benchmark metrics if available
      let benchmarkMetrics = undefined;
      if (sleepStats.totalSleepBenchmarkSec !== undefined) {
        benchmarkMetrics = {
          totalSleepTimeSec: sleepStats.totalSleepBenchmarkSec || 0,
          timeInBedSec: (sleepStats.totalSleepBenchmarkSec || 0) + (sleepStats.awakeBenchmarkSec || 0),
          deepSec: sleepStats.deepBenchmarkSec || 0,
          lightSec: sleepStats.lightBenchmarkSec || 0,
          remSec: sleepStats.remBenchmarkSec || 0,
          awakeSec: sleepStats.awakeBenchmarkSec || 0,
          sleepOnsetTime: sleepStats.benchmarkSleepOnsetTime,
          finalWakeTime: sleepStats.benchmarkFinalWakeTime,
        };
      }

      return {
        sessionId: session._id.toString(),
        userId: session.userId._id.toString(),
        userName: (session.userId as any).name,
        date: session.startTime,
        firmwareVersion,
        benchmarkDeviceType,
        sessionStartTime: session.startTime,
        sessionEndTime: session.endTime,
        luna: lunaMetrics,
        benchmark: benchmarkMetrics,
        accuracyPercent: sleepStats.epochAccuracyPercent || 0,
        kappaScore: sleepStats.kappaScore || 0,
        deepBiasSec: sleepStats.deepDiffSec || 0,
        remBiasSec: sleepStats.remDiffSec || 0,
        totalSleepBiasSec: sleepStats.totalSleepDiffSec || 0,
        stageSensitivity,
        stageSpecificity,
        confusionMatrix: cm,
      };
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting admin session summary:", error);
      throw error;
    }
  }

  /**
   * Get accuracy trend over time
   */
  static async getAccuracyTrend(
    startDate?: Date,
    endDate?: Date
  ): Promise<IAccuracyTrend[]> {
    try {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;

      const sessions = await Session.find({
        metric: "Sleep",
        isValid: true,
        ...(Object.keys(dateFilter).length > 0 ? { startTime: dateFilter } : {}),
      }).sort({ startTime: 1 });

      const sessionIds = sessions.map((s) => s._id);
      
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
      });

      // Group by date
      const dateGroups = new Map<string, any[]>();

      analyses.forEach((analysis) => {
        const session = sessions.find((s) => s._id.toString() === analysis.sessionId.toString());
        if (!session) return;

        const dateKey = session.startTime.toISOString().split("T")[0];
        
        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, []);
        }
        dateGroups.get(dateKey)!.push(analysis);
      });

      const trendData: IAccuracyTrend[] = [];

      for (const [dateKey, analyses] of dateGroups.entries()) {
        let accuracySum = 0;
        let kappaSum = 0;
        let biasSum = 0;
        let validationCount = 0;

        analyses.forEach((analysis) => {
          const sleepStats = analysis.sleepStats;
          if (!sleepStats) return;

          if (sleepStats.epochAccuracyPercent !== undefined) {
            validationCount++;
            accuracySum += sleepStats.epochAccuracyPercent;
            kappaSum += sleepStats.kappaScore || 0;
            biasSum += sleepStats.totalSleepDiffSec || 0;
          }
        });

        if (validationCount > 0) {
          trendData.push({
            date: new Date(dateKey),
            avgAccuracyPercent: accuracySum / validationCount,
            avgKappaScore: kappaSum / validationCount,
            avgBiasSec: biasSum / validationCount,
            sessionCount: validationCount,
          });
        }
      }

      return trendData.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error("[AdminSleepSummaryService] Error getting accuracy trend:", error);
      throw error;
    }
  }
}
