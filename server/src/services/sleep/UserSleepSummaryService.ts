import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import SleepStageEpoch from "../../models/SleepStageEpoch";

interface IUserSleepOverview {
  totalSessions: number;
  
  // Core Sleep Metrics (averages across all sessions)
  avgTotalSleepTimeSec: number;
  avgTimeInBedSec: number;
  avgSleepEfficiency: number;
  avgDeepSleepSec: number;
  avgRemSleepSec: number;
  avgLightSleepSec: number;
  avgAwakeSec: number;
  avgSleepScore?: number;
  
  // Percentages
  avgDeepPercent: number;
  avgRemPercent: number;
  avgLightPercent: number;
  
  // Variability metrics
  sleepDurationStdDev: number;
  sleepConsistencyScore?: number; // Variance in sleep start times
  
  // Optional Comparison Metrics (If Benchmark Available)
  comparison?: {
    avgTotalSleepDiffSec: number;
    avgDeepDiffSec: number;
    avgRemDiffSec: number;
    avgAccuracyPercent: number;
  };
}

interface ISingleSessionView {
  session: {
    _id: string;
    name?: string;
    startTime: Date;
    endTime: Date;
    date: Date;
  };
  
  // Luna metrics
  luna: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    sleepEfficiencyPercent: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
    awakeSec: number;
    sleepScore?: number;
    sleepOnsetTime?: Date;
    finalWakeTime?: Date;
  };
  
  // Benchmark metrics (if available)
  benchmark?: {
    deviceType: string;
    totalSleepTimeSec: number;
    timeInBedSec: number;
    sleepEfficiencyPercent: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
    awakeSec: number;
    sleepOnsetTime?: Date;
    finalWakeTime?: Date;
    sleepScore?: number;
  };
  
  // Comparison (if benchmark available)
  comparison?: {
    agreementPercent: number;
    kappaScore: number;
    totalSleepDifferenceSec: number;
    deepDifferenceSec: number;
    remDifferenceSec: number;
  };
  
  // Epochs data (if requested)
  epochs?: {
    luna: ISleepEpochData[];
    benchmark?: ISleepEpochData[];
  };
}

interface ISleepEpochData {
  timestamp: Date;
  stage: 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM';
  durationSec: number;
}

interface ISleepTrendData {
  date: Date;
  totalSleepTimeSec: number;
  deepSec: number;
  remSec: number;
  lightSec: number;
  awakeSec: number;
  sleepEfficiencyPercent: number;
  accuracyPercent?: number; // If comparison available
  kappaScore?: number;
}

interface ISleepArchitectureDistribution {
  lightPercent: number;
  deepPercent: number;
  remPercent: number;
  awakePercent: number;
}

/**
 * UserSleepSummaryService
 * Provides user-facing sleep insights
 */
export class UserSleepSummaryService {
  /**
   * Get user sleep overview (1A - across all sessions)
   */
  static async getUserSleepOverview(userId: Types.ObjectId | string): Promise<IUserSleepOverview> {
    try {
      // Fetch all sleep sessions for this user
      const sessions = await Session.find({
        userId,
        metric: "Sleep",
        isValid: true,
      });

      if (sessions.length === 0) {
        // Return empty/default data instead of throwing error
        return {
          totalSessions: 0,
          avgTotalSleepTimeSec: 0,
          avgTimeInBedSec: 0,
          avgSleepEfficiency: 0,
          avgDeepSleepSec: 0,
          avgRemSleepSec: 0,
          avgLightSleepSec: 0,
          avgAwakeSec: 0,
          avgDeepPercent: 0,
          avgRemPercent: 0,
          avgLightPercent: 0,
          sleepDurationStdDev: 0,
        };
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch all session analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
      });

      if (analyses.length === 0) {
        // Return empty/default data instead of throwing error
        return {
          totalSessions: sessions.length,
          avgTotalSleepTimeSec: 0,
          avgTimeInBedSec: 0,
          avgSleepEfficiency: 0,
          avgDeepSleepSec: 0,
          avgRemSleepSec: 0,
          avgLightSleepSec: 0,
          avgAwakeSec: 0,
          avgDeepPercent: 0,
          avgRemPercent: 0,
          avgLightPercent: 0,
          sleepDurationStdDev: 0,
        };
      }

      // Calculate aggregates
      let totalSleepSum = 0;
      let timeInBedSum = 0;
      let efficiencySum = 0;
      let deepSum = 0;
      let remSum = 0;
      let lightSum = 0;
      let awakeSum = 0;
      let sleepScoreSum = 0;
      let sleepScoreCount = 0;
      
      // For comparison metrics
      let comparisonCount = 0;
      let totalSleepDiffSum = 0;
      let deepDiffSum = 0;
      let remDiffSum = 0;
      let accuracySum = 0;

      // For variability
      const sleepDurations: number[] = [];

      analyses.forEach((analysis) => {
        const sleepStats = analysis.sleepStats;
        if (!sleepStats) return;

        const totalSleep = sleepStats.totalSleepLunaSec || 0;
        const deep = sleepStats.deepLunaSec || 0;
        const rem = sleepStats.remLunaSec || 0;
        const light = totalSleep - deep - rem; // Approximate
        const awake = sleepStats.awakeDiffSec || 0; // If available
        const timeInBed = totalSleep + Math.abs(awake);
        const efficiency = sleepStats.sleepEfficiency || 0;

        totalSleepSum += totalSleep;
        timeInBedSum += timeInBed;
        efficiencySum += efficiency;
        deepSum += deep;
        remSum += rem;
        lightSum += light;
        awakeSum += Math.abs(awake);
        
        sleepDurations.push(totalSleep);

        if (sleepStats.sleepScore) {
          sleepScoreSum += sleepStats.sleepScore;
          sleepScoreCount++;
        }

        // If comparison available
        if (sleepStats.epochAccuracyPercent !== undefined) {
          comparisonCount++;
          totalSleepDiffSum += sleepStats.totalSleepDiffSec || 0;
          deepDiffSum += sleepStats.deepDiffSec || 0;
          remDiffSum += sleepStats.remDiffSec || 0;
          accuracySum += sleepStats.epochAccuracyPercent;
        }
      });

      const count = analyses.length;
      const avgTotalSleep = totalSleepSum / count;

      // Calculate sleep duration standard deviation
      const mean = avgTotalSleep;
      const variance = sleepDurations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Build response
      const overview: IUserSleepOverview = {
        totalSessions: count,
        avgTotalSleepTimeSec: avgTotalSleep,
        avgTimeInBedSec: timeInBedSum / count,
        avgSleepEfficiency: efficiencySum / count,
        avgDeepSleepSec: deepSum / count,
        avgRemSleepSec: remSum / count,
        avgLightSleepSec: lightSum / count,
        avgAwakeSec: awakeSum / count,
        avgSleepScore: sleepScoreCount > 0 ? sleepScoreSum / sleepScoreCount : undefined,
        avgDeepPercent: (deepSum / totalSleepSum) * 100,
        avgRemPercent: (remSum / totalSleepSum) * 100,
        avgLightPercent: (lightSum / totalSleepSum) * 100,
        sleepDurationStdDev: stdDev,
        sleepConsistencyScore: undefined, // TODO: Calculate variance in sleep start times
      };

      // Add comparison if available
      if (comparisonCount > 0) {
        overview.comparison = {
          avgTotalSleepDiffSec: totalSleepDiffSum / comparisonCount,
          avgDeepDiffSec: deepDiffSum / comparisonCount,
          avgRemDiffSec: remDiffSum / comparisonCount,
          avgAccuracyPercent: accuracySum / comparisonCount,
        };
      }

      return overview;
    } catch (error) {
      console.error("[UserSleepSummaryService] Error getting user sleep overview:", error);
      throw error;
    }
  }

  /**
   * Get single session detailed view (1B)
   */
  static async getSingleSessionView(
    sessionId: Types.ObjectId | string,
    includeEpochs: boolean = false
  ): Promise<ISingleSessionView> {
    try {
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      if (session.metric !== "Sleep") {
        throw new Error("Not a sleep session");
      }

      const analysis = await SessionAnalysis.findOne({ sessionId });
      if (!analysis || !analysis.sleepStats) {
        throw new Error("Sleep analysis not available for this session");
      }

      const sleepStats = analysis.sleepStats;

      // Build Luna data
      const totalSleepLuna = sleepStats.totalSleepLunaSec || 0;
      const deepLuna = sleepStats.deepLunaSec || 0;
      const remLuna = sleepStats.remLunaSec || 0;
      const lightLuna = sleepStats.lightLunaSec || 0;
      const awakeLuna = sleepStats.awakeLunaSec || 0;
      const timeInBedLuna = totalSleepLuna + awakeLuna;
      const efficiency = sleepStats.sleepEfficiency || 0;

      const response: ISingleSessionView = {
        session: {
          _id: session._id.toString(),
          name: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.startTime,
        },
        luna: {
          totalSleepTimeSec: totalSleepLuna,
          timeInBedSec: timeInBedLuna,
          sleepEfficiencyPercent: efficiency,
          deepSec: deepLuna,
          remSec: remLuna,
          lightSec: lightLuna,
          awakeSec: awakeLuna,
          sleepScore: sleepStats.sleepScore,
          sleepOnsetTime: sleepStats.lunaSleepOnsetTime,
          finalWakeTime: sleepStats.lunaFinalWakeTime,
        },
      };

      // Add Benchmark data if available
      if (sleepStats.totalSleepBenchmarkSec !== undefined) {
        const totalSleepBenchmark = sleepStats.totalSleepBenchmarkSec;
        const deepBenchmark = sleepStats.deepBenchmarkSec || 0;
        const remBenchmark = sleepStats.remBenchmarkSec || 0;
        const lightBenchmark = sleepStats.lightBenchmarkSec || 0;
        const awakeBenchmark = sleepStats.awakeBenchmarkSec || 0;
        const timeInBedBenchmark = totalSleepBenchmark + awakeBenchmark;
        const efficiencyBenchmark = timeInBedBenchmark > 0 
          ? (totalSleepBenchmark / timeInBedBenchmark) * 100 
          : 0;

        response.benchmark = {
          deviceType: session.benchmarkDeviceType || 'unknown',
          totalSleepTimeSec: totalSleepBenchmark,
          timeInBedSec: timeInBedBenchmark,
          sleepEfficiencyPercent: efficiencyBenchmark,
          deepSec: deepBenchmark,
          remSec: remBenchmark,
          lightSec: lightBenchmark,
          awakeSec: awakeBenchmark,
          sleepOnsetTime: sleepStats.benchmarkSleepOnsetTime,
          finalWakeTime: sleepStats.benchmarkFinalWakeTime,
          sleepScore: undefined, // Benchmark devices typically don't provide sleep scores
        };

        // Add comparison
        if (sleepStats.epochAccuracyPercent !== undefined) {
          response.comparison = {
            agreementPercent: sleepStats.epochAccuracyPercent,
            kappaScore: sleepStats.kappaScore || 0,
            totalSleepDifferenceSec: sleepStats.totalSleepDiffSec || 0,
            deepDifferenceSec: sleepStats.deepDiffSec || 0,
            remDifferenceSec: sleepStats.remDiffSec || 0,
          };
        }
      }

      // Fetch epochs if requested
      if (includeEpochs) {
        const epochsData = await this.getHypnogramData(sessionId);
        response.epochs = epochsData;
      }

      return response;
    } catch (error) {
      console.error("[UserSleepSummaryService] Error getting single session view:", error);
      throw error;
    }
  }

  /**
   * Get sleep trend data for charts (duration, deep/REM, efficiency)
   */
  static async getSleepTrend(userId: Types.ObjectId | string): Promise<ISleepTrendData[]> {
    try {
      const sessions = await Session.find({
        userId,
        metric: "Sleep",
        isValid: true,
      }).sort({ startTime: 1 });

      const sessionIds = sessions.map((s) => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
      });

      // Create a map for quick lookup
      const analysisMap = new Map();
      analyses.forEach((a) => {
        analysisMap.set(a.sessionId.toString(), a);
      });

      const trendData: ISleepTrendData[] = [];

      sessions.forEach((session) => {
        const analysis = analysisMap.get(session._id.toString());
        if (!analysis || !analysis.sleepStats) return;

        const sleepStats = analysis.sleepStats;
        const totalSleep = sleepStats.totalSleepLunaSec || 0;
        const deep = sleepStats.deepLunaSec || 0;
        const rem = sleepStats.remLunaSec || 0;
        const light = totalSleep - deep - rem;
        const awake = sleepStats.awakeLunaSec || 0;

        trendData.push({
          date: session.startTime,
          totalSleepTimeSec: totalSleep,
          deepSec: deep,
          remSec: rem,
          lightSec: light,
          awakeSec: awake,
          sleepEfficiencyPercent: sleepStats.sleepEfficiency || 0,
          accuracyPercent: sleepStats.epochAccuracyPercent,
          kappaScore: sleepStats.kappaScore,
        });
      });

      return trendData;
    } catch (error) {
      console.error("[UserSleepSummaryService] Error getting sleep trend:", error);
      throw error;
    }
  }

  /**
   * Get sleep architecture distribution (for pie chart)
   */
  static async getSleepArchitectureDistribution(
    userId: Types.ObjectId | string
  ): Promise<ISleepArchitectureDistribution> {
    try {
      const overview = await this.getUserSleepOverview(userId);

      const total =
        overview.avgDeepSleepSec +
        overview.avgRemSleepSec +
        overview.avgLightSleepSec +
        overview.avgAwakeSec;

      // Handle case where there's no data (total is 0)
      if (total === 0) {
        return {
          lightPercent: 0,
          deepPercent: 0,
          remPercent: 0,
          awakePercent: 0,
        };
      }

      return {
        lightPercent: (overview.avgLightSleepSec / total) * 100,
        deepPercent: (overview.avgDeepSleepSec / total) * 100,
        remPercent: (overview.avgRemSleepSec / total) * 100,
        awakePercent: (overview.avgAwakeSec / total) * 100,
      };
    } catch (error) {
      console.error("[UserSleepSummaryService] Error getting architecture distribution:", error);
      throw error;
    }
  }

  /**
   * Get hypnogram data for a single session
   */
  static async getHypnogramData(sessionId: Types.ObjectId | string) {
    try {
      // Fetch the session to get benchmark device type
      const session = await Session.findById(sessionId);
      const benchmarkDeviceType = session?.benchmarkDeviceType;

      // Fetch Luna epochs
      const lunaEpochs = await SleepStageEpoch.find({
        "meta.sessionId": sessionId,
        "meta.deviceType": "luna",
      }).sort({ timestamp: 1 });

      // Fetch benchmark epochs (if available)
      let benchmarkEpochs: any[] = [];
      if (benchmarkDeviceType) {
        benchmarkEpochs = await SleepStageEpoch.find({
          "meta.sessionId": sessionId,
          "meta.deviceType": benchmarkDeviceType,
        }).sort({ timestamp: 1 });
      }

      return {
        luna: lunaEpochs.map((e) => ({
          timestamp: e.timestamp,
          stage: e.stage,
          durationSec: e.durationSec,
        })),
        benchmark:
          benchmarkEpochs.length > 0
            ? benchmarkEpochs.map((e) => ({
                timestamp: e.timestamp,
                stage: e.stage,
                durationSec: e.durationSec,
              }))
            : undefined,
      };
    } catch (error) {
      console.error("[UserSleepSummaryService] Error getting hypnogram data:", error);
      throw error;
    }
  }
}
