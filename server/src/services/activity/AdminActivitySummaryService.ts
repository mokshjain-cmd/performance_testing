import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import AdminGlobalSummary from "../../models/AdminGlobalSummary";
import FirmwarePerformance from "../../models/FirmwarePerformance";
import BenchmarkComparisonSummary from "../../models/BenchmarkComparisonSummary";
import AdminDailyTrend from "../../models/AdminDailyTrend";
import UserAccuracySummary from "../../models/UserAccuracySummary";
import { getLatestFirmwareVersion } from "../../controllers/firmwareConfig.controller";

/**
 * AdminActivitySummaryService
 * Provides admin-facing activity analytics for Steps, Calories, and Distance
 */
export class AdminActivitySummaryService {
  /**
   * Get admin global activity summary
   * All users, all sessions, optionally filtered by latest firmware
   */
  static async getGlobalSummary(latestFirmwareOnly: boolean = false) {
    try {
      let sessions;
      
      if (latestFirmwareOnly) {
        const latestFirmware = await getLatestFirmwareVersion("Steps");
        
        if (latestFirmware) {
          console.log(`[AdminActivitySummaryService] Filtering by latest firmware: ${latestFirmware}`);
          
          const allSessions = await Session.find({
            metric: { $in: ["Steps", "Calories"] },
            isValid: true,
          });
          
          sessions = allSessions.filter((session: any) => {
            const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
            return lunaDevice?.firmwareVersion === latestFirmware;
          });
        } else {
          sessions = await Session.find({
            metric: { $in: ["Steps", "Calories"] },
            isValid: true,
          });
        }
      } else {
        sessions = await Session.find({
          metric: { $in: ["Steps", "Calories"] },
          isValid: true,
        });
      }

      const sessionIds = sessions.map((s: any) => s._id);
      const uniqueUsers = new Set(sessions.map((s: any) => s.userId.toString()));

      // Fetch activity analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      if (analyses.length === 0) {
        throw new Error("No activity analysis data available");
      }

      // Aggregate metrics
      let stepsAccuracySum = 0;
      let stepsBiasSum = 0;
      let stepsMaeSum = 0;
      let stepsMapeSum = 0;

      let distanceAccuracySum = 0;
      let distanceBiasSum = 0;
      let distanceMaeSum = 0;
      let distanceMapeSum = 0;

      let caloriesAccuracySum = 0;
      let caloriesBiasSum = 0;
      let caloriesMaeSum = 0;
      let caloriesMapeSum = 0;

      analyses.forEach((analysis: any) => {
        const activityStats = analysis.activityStats;
        if (activityStats) {
          // Steps
          if (activityStats.steps) {
            stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
            stepsBiasSum += activityStats.steps.bias || 0;
            stepsMaeSum += activityStats.steps.mae || 0;
            stepsMapeSum += activityStats.steps.mape || 0;
          }
          // Distance
          if (activityStats.distance) {
            distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
            distanceBiasSum += activityStats.distance.bias || 0;
            distanceMaeSum += activityStats.distance.mae || 0;
            distanceMapeSum += activityStats.distance.mape || 0;
          }
          // Calories
          if (activityStats.calories) {
            caloriesAccuracySum += activityStats.calories.accuracyPercent || 0;
            caloriesBiasSum += activityStats.calories.bias || 0;
            caloriesMaeSum += activityStats.calories.mae || 0;
            caloriesMapeSum += activityStats.calories.mape || 0;
          }
        }
      });

      const count = analyses.length;

      // Get latest firmware version
      const latestFirmwareVersion = await getLatestFirmwareVersion("Steps") || "N/A";

      return {
        totalUsers: uniqueUsers.size,
        totalSessions: sessions.length,
        latestFirmwareVersion,
        activityStats: {
          steps: {
            avgAccuracyPercent: parseFloat((stepsAccuracySum / count).toFixed(2)),
            avgBias: parseFloat((stepsBiasSum / count).toFixed(2)),
            avgMae: parseFloat((stepsMaeSum / count).toFixed(2)),
            avgMape: parseFloat((stepsMapeSum / count).toFixed(2)),
          },
          distance: {
            avgAccuracyPercent: parseFloat((distanceAccuracySum / count).toFixed(2)),
            avgBias: parseFloat((distanceBiasSum / count).toFixed(2)),
            avgMae: parseFloat((distanceMaeSum / count).toFixed(2)),
            avgMape: parseFloat((distanceMapeSum / count).toFixed(2)),
          },
          calories: {
            avgAccuracyPercent: parseFloat((caloriesAccuracySum / count).toFixed(2)),
            avgBias: parseFloat((caloriesBiasSum / count).toFixed(2)),
            avgMae: parseFloat((caloriesMaeSum / count).toFixed(2)),
            avgMape: parseFloat((caloriesMapeSum / count).toFixed(2)),
          },
        },
      };
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting global summary:", error);
      throw error;
    }
  }

  /**
   * Get firmware-wise activity performance comparison
   */
  static async getFirmwareComparison() {
    try {
      const firmwarePerformances = await FirmwarePerformance.find({
        "activityStats": { $exists: true },
      }).sort({ firmwareVersion: 1 });

      return firmwarePerformances.map((fp: any) => ({
        firmwareVersion: fp.firmwareVersion,
        totalSessions: fp.totalSessions,
        activityStats: fp.activityStats,
      }));
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting firmware comparison:", error);
      throw error;
    }
  }

  /**
   * Get benchmark device activity performance comparison
   */
  static async getBenchmarkComparison() {
    try {
      const benchmarkComparisons = await BenchmarkComparisonSummary.find({
        "activityStats": { $exists: true },
      }).sort({ benchmarkDevice: 1 });

      return benchmarkComparisons.map((bc: any) => ({
        benchmarkDevice: bc.benchmarkDevice,
        totalSessions: bc.totalSessions,
        activityStats: bc.activityStats,
      }));
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting benchmark comparison:", error);
      throw error;
    }
  }

  /**
   * Get activity accuracy trend over time
   */
  static async getAccuracyTrend(startDate?: Date, endDate?: Date) {
    try {
      const query: any = {
        "activityStats": { $exists: true },
      };

      if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
      }

      const trends = await AdminDailyTrend.find(query)
        .sort({ date: 1 })
        .limit(90); // Last 90 days

      return trends.map((trend: any) => ({
        date: trend.date,
        activityStats: trend.activityStats,
        sessionCount: trend.sleepSessionCount + trend.hrSessionCount + trend.spO2SessionCount || 0, // Note: might need to add activitySessionCount field
      }));
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting accuracy trend:", error);
      throw error;
    }
  }

  /**
   * Get admin view of specific user's activity summary
   */
  static async getAdminUserSummary(userId: string) {
    try {
      const userSummary = await UserAccuracySummary.findOne({ userId });

      if (!userSummary) {
        throw new Error("User activity summary not found");
      }

      const sessions = await Session.find({
        userId,
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      }).sort({ createdAt: -1 });

      return {
        userId,
        totalSessions: sessions.length,
        activityOverview: (userSummary as any).activityOverview || null,
      };
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting admin user summary:", error);
      throw error;
    }
  }

  /**
   * Get admin view of specific activity session
   */
  static async getAdminSessionSummary(sessionId: string) {
    try {
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      const analysis = await SessionAnalysis.findOne({ sessionId });
      if (!analysis) {
        throw new Error("Activity analysis not found for session");
      }

      return {
        sessionId,
        userId: session.userId,
        metric: session.metric,
        devices: session.devices,
        activityStats: (analysis as any).activityStats || null,
        createdAt: session.createdAt,
      };
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting admin session summary:", error);
      throw error;
    }
  }

  /**
   * Get user firmware comparison for activity metrics
   */
  static async getUserFirmwareComparison(userId: string) {
    try {
      const sessions = await Session.find({
        userId,
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      });

      const sessionIds = sessions.map((s: any) => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        activityStats: { $exists: true },
      });

      // Group by firmware version
      const firmwareMap = new Map<string, any[]>();

      sessions.forEach((session: any) => {
        const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
        if (lunaDevice?.firmwareVersion) {
          if (!firmwareMap.has(lunaDevice.firmwareVersion)) {
            firmwareMap.set(lunaDevice.firmwareVersion, []);
          }
          firmwareMap.get(lunaDevice.firmwareVersion)!.push(session._id.toString());
        }
      });

      const result = [];

      for (const [firmware, sessionIds] of firmwareMap.entries()) {
        const relevantAnalyses = analyses.filter((a: any) => 
          sessionIds.includes(a.sessionId.toString())
        );

        if (relevantAnalyses.length === 0) continue;

        let stepsAccSum = 0, stepsBiasSum = 0, stepsMaeSum = 0;
        let distanceAccSum = 0, distanceBiasSum = 0, distanceMaeSum = 0;
        let caloriesAccSum = 0, caloriesBiasSum = 0, caloriesMaeSum = 0;

        relevantAnalyses.forEach((analysis: any) => {
          const stats = analysis.activityStats;
          if (stats) {
            if (stats.steps) {
              stepsAccSum += stats.steps.accuracyPercent || 0;
              stepsBiasSum += stats.steps.bias || 0;
              stepsMaeSum += stats.steps.mae || 0;
            }
            if (stats.distance) {
              distanceAccSum += stats.distance.accuracyPercent || 0;
              distanceBiasSum += stats.distance.bias || 0;
              distanceMaeSum += stats.distance.mae || 0;
            }
            if (stats.calories) {
              caloriesAccSum += stats.calories.accuracyPercent || 0;
              caloriesBiasSum += stats.calories.bias || 0;
              caloriesMaeSum += stats.calories.mae || 0;
            }
          }
        });

        const count = relevantAnalyses.length;

        result.push({
          firmwareVersion: firmware,
          totalSessions: count,
          activityStats: {
            steps: {
              avgAccuracyPercent: parseFloat((stepsAccSum / count).toFixed(2)),
              avgBias: parseFloat((stepsBiasSum / count).toFixed(2)),
              avgMae: parseFloat((stepsMaeSum / count).toFixed(2)),
            },
            distance: {
              avgAccuracyPercent: parseFloat((distanceAccSum / count).toFixed(2)),
              avgBias: parseFloat((distanceBiasSum / count).toFixed(2)),
              avgMae: parseFloat((distanceMaeSum / count).toFixed(2)),
            },
            calories: {
              avgAccuracyPercent: parseFloat((caloriesAccSum / count).toFixed(2)),
              avgBias: parseFloat((caloriesBiasSum / count).toFixed(2)),
              avgMae: parseFloat((caloriesMaeSum / count).toFixed(2)),
            },
          },
        });
      }

      return result.sort((a, b) => a.firmwareVersion.localeCompare(b.firmwareVersion));
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting user firmware comparison:", error);
      throw error;
    }
  }

  /**
   * Get user benchmark device comparison for activity metrics
   */
  static async getUserBenchmarkComparison(userId: string) {
    try {
      const sessions = await Session.find({
        userId,
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      });

      const sessionIds = sessions.map((s: any) => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        activityStats: { $exists: true },
      });

      // Group by benchmark device
      const benchmarkMap = new Map<string, any[]>();

      sessions.forEach((session: any) => {
        const benchmarkDevice = session.devices.find((d: any) => d.deviceType !== "luna");
        if (benchmarkDevice?.deviceType) {
          if (!benchmarkMap.has(benchmarkDevice.deviceType)) {
            benchmarkMap.set(benchmarkDevice.deviceType, []);
          }
          benchmarkMap.get(benchmarkDevice.deviceType)!.push(session._id.toString());
        }
      });

      const result = [];

      for (const [benchmark, sessionIds] of benchmarkMap.entries()) {
        const relevantAnalyses = analyses.filter((a: any) => 
          sessionIds.includes(a.sessionId.toString())
        );

        if (relevantAnalyses.length === 0) continue;

        let stepsAccSum = 0, stepsBiasSum = 0, stepsMaeSum = 0;
        let distanceAccSum = 0, distanceBiasSum = 0, distanceMaeSum = 0;
        let caloriesAccSum = 0, caloriesBiasSum = 0, caloriesMaeSum = 0;

        relevantAnalyses.forEach((analysis: any) => {
          const stats = analysis.activityStats;
          if (stats) {
            if (stats.steps) {
              stepsAccSum += stats.steps.accuracyPercent || 0;
              stepsBiasSum += stats.steps.bias || 0;
              stepsMaeSum += stats.steps.mae || 0;
            }
            if (stats.distance) {
              distanceAccSum += stats.distance.accuracyPercent || 0;
              distanceBiasSum += stats.distance.bias || 0;
              distanceMaeSum += stats.distance.mae || 0;
            }
            if (stats.calories) {
              caloriesAccSum += stats.calories.accuracyPercent || 0;
              caloriesBiasSum += stats.calories.bias || 0;
              caloriesMaeSum += stats.calories.mae || 0;
            }
          }
        });

        const count = relevantAnalyses.length;

        result.push({
          benchmarkDevice: benchmark,
          totalSessions: count,
          activityStats: {
            steps: {
              avgAccuracyPercent: parseFloat((stepsAccSum / count).toFixed(2)),
              avgBias: parseFloat((stepsBiasSum / count).toFixed(2)),
              avgMae: parseFloat((stepsMaeSum / count).toFixed(2)),
            },
            distance: {
              avgAccuracyPercent: parseFloat((distanceAccSum / count).toFixed(2)),
              avgBias: parseFloat((distanceBiasSum / count).toFixed(2)),
              avgMae: parseFloat((distanceMaeSum / count).toFixed(2)),
            },
            calories: {
              avgAccuracyPercent: parseFloat((caloriesAccSum / count).toFixed(2)),
              avgBias: parseFloat((caloriesBiasSum / count).toFixed(2)),
              avgMae: parseFloat((caloriesMaeSum / count).toFixed(2)),
            },
          },
        });
      }

      return result.sort((a, b) => a.benchmarkDevice.localeCompare(b.benchmarkDevice));
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting user benchmark comparison:", error);
      throw error;
    }
  }
}
