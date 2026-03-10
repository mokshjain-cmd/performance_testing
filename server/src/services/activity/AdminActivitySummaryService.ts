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
  static async getGlobalSummary(latestFirmwareOnly: boolean = false): Promise<{
    totalUsers: number;
    totalSessions: number;
    latestFirmwareVersion: string;
    activityStats: {
      steps: { avgAccuracyPercent: number; avgDifference: number };
      distance: { avgAccuracyPercent: number; avgDifference: number };
      calories: { avgAccuracyPercent: number; avgDifference: number };
      activeCalories?: { avgAccuracyPercent: number; avgDifference: number };
      basalCalories?: { avgAccuracyPercent: number; avgDifference: number };
    };
  }> {
    try {
      if (!latestFirmwareOnly) {
        // Fetch from cache
        const summary = await AdminGlobalSummary.findOne({
          metric: "Activity",
        });

        if (!summary || !summary.activityStats) {
          throw new Error("No activity summary data available");
        }

        return {
          totalUsers: summary.totalUsers || 0,
          totalSessions: summary.totalSessions || 0,
          latestFirmwareVersion: summary.latestFirmwareVersion || "N/A",
          activityStats: {
            steps: {
              avgAccuracyPercent: summary.activityStats.steps?.avgAccuracyPercent || 0,
              avgDifference: summary.activityStats.steps?.avgDifference || 0,
            },
            distance: {
              avgAccuracyPercent: summary.activityStats.distance?.avgAccuracyPercent || 0,
              avgDifference: summary.activityStats.distance?.avgDifference || 0,
            },
            calories: {
              avgAccuracyPercent: summary.activityStats.calories?.avgAccuracyPercent || 0,
              avgDifference: summary.activityStats.calories?.avgDifference || 0,
            },
            activeCalories: summary.activityStats.activeCalories ? {
              avgAccuracyPercent: summary.activityStats.activeCalories.avgAccuracyPercent || 0,
              avgDifference: summary.activityStats.activeCalories.avgDifference || 0,
            } : undefined,
            basalCalories: summary.activityStats.basalCalories ? {
              avgAccuracyPercent: summary.activityStats.basalCalories.avgAccuracyPercent || 0,
              avgDifference: summary.activityStats.basalCalories.avgDifference || 0,
            } : undefined,
          },
        };
      }

      // latestFirmwareOnly = true: dynamically filter by latest firmware
      const latestFirmware = await getLatestFirmwareVersion("Activity");
      
      if (!latestFirmware) {
        console.log(`[AdminActivitySummaryService] No latest firmware configured, fetching from cache`);
        // Fall back to cache
        return this.getGlobalSummary(false);
      }

      console.log(`[AdminActivitySummaryService] Filtering by latest firmware: ${latestFirmware}`);

      // Find sessions where luna device has the latest firmware version
      const allSessions = await Session.find({
        metric: "Activity",
        isValid: true,
      });

      // Filter sessions by firmware version
      const sessions = allSessions.filter((session) => {
        const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
        return lunaDevice?.firmwareVersion === latestFirmware;
      });

      if (sessions.length === 0) {
        throw new Error("No activity sessions found with latest firmware");
      }

      console.log(`[AdminActivitySummaryService] Found ${sessions.length} sessions with firmware ${latestFirmware}`);

      // Get session IDs
      const sessionIds = sessions.map(s => s._id);

      // Fetch analyses for these sessions
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let stepBiasSum = 0;
      let stepsCount = 0;

      let distanceAccuracySum = 0;
      let distanceBiasSum = 0;
      let distanceCount = 0;

      let calorieAccuracySum = 0;
      let calorieBiasSum = 0;
      let caloriesCount = 0;

      let activeCaloriesAccuracySum = 0;
      let activeCaloriesBiasSum = 0;
      let activeCaloriesCount = 0;

      let basalCaloriesAccuracySum = 0;
      let basalCaloriesBiasSum = 0;
      let basalCaloriesCount = 0;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepBiasSum += activityStats.steps.bias || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceBiasSum += activityStats.distance.bias || 0;
          distanceCount++;
        }

        if (activityStats.calories) {
          calorieAccuracySum += activityStats.calories.accuracyPercent || 0;
          calorieBiasSum += activityStats.calories.bias || 0;
          caloriesCount++;
        }

        if (activityStats.activeCalories) {
          activeCaloriesAccuracySum += activityStats.activeCalories.accuracyPercent || 0;
          activeCaloriesBiasSum += activityStats.activeCalories.bias || 0;
          activeCaloriesCount++;
        }

        if (activityStats.basalCalories) {
          basalCaloriesAccuracySum += activityStats.basalCalories.accuracyPercent || 0;
          basalCaloriesBiasSum += activityStats.basalCalories.bias || 0;
          basalCaloriesCount++;
        }
      });

      // Build activityStats object
      const activityStats: any = {
        steps: stepsCount > 0 ? {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepBiasSum / stepsCount),
        } : { avgAccuracyPercent: 0, avgDifference: 0 },
        distance: distanceCount > 0 ? {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        } : { avgAccuracyPercent: 0, avgDifference: 0 },
        calories: caloriesCount > 0 ? {
          avgAccuracyPercent: Math.round((calorieAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(calorieBiasSum / caloriesCount),
        } : { avgAccuracyPercent: 0, avgDifference: 0 },
      };

      if (activeCaloriesCount > 0) {
        activityStats.activeCalories = {
          avgAccuracyPercent: Math.round((activeCaloriesAccuracySum / activeCaloriesCount) * 100) / 100,
          avgDifference: Math.round(activeCaloriesBiasSum / activeCaloriesCount),
        };
      }

      if (basalCaloriesCount > 0) {
        activityStats.basalCalories = {
          avgAccuracyPercent: Math.round((basalCaloriesAccuracySum / basalCaloriesCount) * 100) / 100,
          avgDifference: Math.round(basalCaloriesBiasSum / basalCaloriesCount),
        };
      }

      // Get unique user count
      const uniqueUserIds = new Set(analyses.map((a) => a.userId.toString()));

      return {
        totalUsers: uniqueUserIds.size,
        totalSessions: sessions.length,
        latestFirmwareVersion: latestFirmware,
        activityStats,
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
        metric: "Activity",
        "activityStats": { $exists: true },
      }).sort({ benchmarkDeviceType: 1 });

      console.log(`[AdminActivitySummaryService] Found ${benchmarkComparisons.length} benchmark comparisons`);
      
      return benchmarkComparisons.map((bc: any) => ({
        benchmarkDevice: bc.benchmarkDeviceType,
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
      const userSummary = await UserAccuracySummary.findOne({ userId, metric: "Activity" });

      if (!userSummary) {
        throw new Error("User activity summary not found");
      }

      const sessions = await Session.find({
        userId,
        metric: "Activity",
        isValid: true,
      }).sort({ createdAt: -1 });

      // Transform activityOverview to match frontend expectations
      const activityOverview = (userSummary as any).activityOverview;
      const transformedOverview = activityOverview ? {
        totalSessions: sessions.length,
        avgTotalSteps: activityOverview.avgDailySteps || 0,
        avgTotalDistance: activityOverview.avgDailyDistance || 0,
        avgTotalCalories: activityOverview.avgDailyCalories || 0,
        avgStepsAccuracyPercent: activityOverview.steps?.avgAccuracyPercent || 0,
        avgDistanceAccuracyPercent: activityOverview.distance?.avgAccuracyPercent || 0,
        avgCaloriesAccuracyPercent: activityOverview.calories?.avgAccuracyPercent || 0,
        avgActiveCaloriesAccuracyPercent: activityOverview.activeCalories?.avgAccuracyPercent || 0,
        avgBasalCaloriesAccuracyPercent: activityOverview.basalCalories?.avgAccuracyPercent || 0,
        avgStepsBias: activityOverview.steps?.avgDifference || 0,
        avgDistanceBias: activityOverview.distance?.avgDifference || 0,
        avgCaloriesBias: activityOverview.calories?.avgDifference || 0,
        avgActiveCaloriesBias: activityOverview.activeCalories?.avgDifference || 0,
        avgBasalCaloriesBias: activityOverview.basalCalories?.avgDifference || 0,
      } : null;

      return {
        userId,
        totalSessions: sessions.length,
        activityOverview: transformedOverview,
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
      // Reuse user session view service to get full session data
      const UserActivitySummaryService = require("./UserActivitySummaryService").UserActivitySummaryService;
      const sessionData = await UserActivitySummaryService.getSingleSessionView(sessionId, true);
      
      // Get userId from session
      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error("Session not found");
      }

      // Return the full session view data (same as user view) plus userId
      return {
        ...sessionData,
        userId: session.userId.toString(),
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
        metric: "Activity",
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
        metric: "Activity",
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

  /**
   * Get user activity trend (for admin view)
   * Reuses UserActivitySummaryService to get trend data for a specific user
   */
  static async getUserActivityTrend(userId: string) {
    try {
      const UserActivitySummaryService = require("./UserActivitySummaryService").UserActivitySummaryService;
      return await UserActivitySummaryService.getActivityTrend(userId);
    } catch (error) {
      console.error("[AdminActivitySummaryService] Error getting user activity trend:", error);
      throw error;
    }
  }
}
