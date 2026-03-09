import { Types } from "mongoose";
import SessionAnalysis from "../../models/SessionAnalysis";
import UserAccuracySummary from "../../models/UserAccuracySummary";
import BenchmarkComparisonSummary from "../../models/BenchmarkComparisonSummary";
import AdminGlobalSummary from "../../models/AdminGlobalSummary";
import AdminDailyTrend from "../../models/AdminDailyTrend";
import FirmwarePerformance from "../../models/FirmwarePerformance";
import Session from "../../models/Session";

/**
 * ActivitySummaryService
 * Updates all activity-related summary collections after session analysis
 */
export class ActivitySummaryService {
  /**
   * Update user activity summary
   * This updates the useraccuracysummaries collection with activity metrics
   */
  static async updateUserActivitySummary(userId: Types.ObjectId | string): Promise<void> {
    try {
      console.log(`[ActivitySummaryService] Updating user activity summary for user: ${userId}`);

      // Fetch all activity sessions for this user
      const sessions = await Session.find({
        userId,
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      });

      if (sessions.length === 0) {
        console.log(`[ActivitySummaryService] No activity sessions found for user ${userId}`);
        return;
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch all activity session analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      if (analyses.length === 0) {
        console.log(`[ActivitySummaryService] No activity analyses found for user ${userId}`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let stepsMAESum = 0;
      let stepsMAPESum = 0;
      let stepsBiasSum = 0;
      let stepsCount = 0;

      let distanceAccuracySum = 0;
      let distanceMAPESum = 0;
      let distanceCount = 0;

      let caloriesAccuracySum = 0;
      let caloriesMAPESum = 0;
      let caloriesCount = 0;

      let activeCaloriesAccuracySum = 0;
      let activeCaloriesCount = 0;

      let basalCaloriesAccuracySum = 0;
      let basalCaloriesCount = 0;

      let bestSession: any = null;
      let worstSession: any = null;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        // Steps stats
        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepsMAESum += activityStats.steps.mae || 0;
          stepsMAPESum += activityStats.steps.mape || 0;
          stepsBiasSum += activityStats.steps.bias || 0;
          stepsCount++;

          // Track best/worst by steps accuracy
          const accuracyPercent = activityStats.steps.accuracyPercent || 0;
          if (!bestSession || accuracyPercent > (bestSession.accuracyPercent || 0)) {
            bestSession = {
              sessionId: analysis.sessionId,
              activityType: analysis.activityType,
              accuracyPercent,
            };
          }
          if (!worstSession || accuracyPercent < (worstSession.accuracyPercent || 100)) {
            worstSession = {
              sessionId: analysis.sessionId,
              activityType: analysis.activityType,
              accuracyPercent,
            };
          }
        }

        // Distance stats
        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceMAPESum += activityStats.distance.mape || 0;
          distanceCount++;
        }

        // Calories stats
        if (activityStats.calories) {
          caloriesAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesMAPESum += activityStats.calories.mape || 0;
          caloriesCount++;
        }

        // Active calories stats
        if (activityStats.activeCalories) {
          activeCaloriesAccuracySum += activityStats.activeCalories.accuracyPercent || 0;
          activeCaloriesCount++;
        }

        // Basal calories stats
        if (activityStats.basalCalories) {
          basalCaloriesAccuracySum += activityStats.basalCalories.accuracyPercent || 0;
          basalCaloriesCount++;
        }
      });

      // Build activityOverview object
      const activityOverview: any = {};

      if (stepsCount > 0) {
        activityOverview.steps = {
          avgAccuracy: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgMAE: Math.round(stepsMAESum / stepsCount),
          avgMAPE: Math.round((stepsMAPESum / stepsCount) * 100) / 100,
          avgBias: Math.round(stepsBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityOverview.distance = {
          avgAccuracy: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgMAPE: Math.round((distanceMAPESum / distanceCount) * 100) / 100,
        };
      }

      if (caloriesCount > 0) {
        activityOverview.calories = {
          avgAccuracy: Math.round((caloriesAccuracySum / caloriesCount) * 100) / 100,
          avgMAPE: Math.round((caloriesMAPESum / caloriesCount) * 100) / 100,
        };
      }

      if (activeCaloriesCount > 0) {
        activityOverview.activeCalories = {
          avgAccuracy: Math.round((activeCaloriesAccuracySum / activeCaloriesCount) * 100) / 100,
        };
      }

      if (basalCaloriesCount > 0) {
        activityOverview.basalCalories = {
          avgAccuracy: Math.round((basalCaloriesAccuracySum / basalCaloriesCount) * 100) / 100,
        };
      }

      // Update UserAccuracySummary for Steps metric
      await UserAccuracySummary.findOneAndUpdate(
        { userId, metric: "Steps" },
        {
          userId,
          metric: "Steps",
          totalSessions: analyses.length,
          activityOverview,
          bestSession,
          worstSession,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivitySummaryService] ✅ Updated user activity summary for user ${userId}`);
    } catch (error) {
      console.error(`[ActivitySummaryService] ❌ Error updating user activity summary:`, error);
      throw error;
    }
  }

  /**
   * Update benchmark comparison summary for activity
   * This updates the benchmarkcomparisonsummaries collection
   */
  static async updateBenchmarkComparisonSummary(
    benchmarkDeviceType: string
  ): Promise<void> {
    try {
      console.log(`[ActivitySummaryService] Updating benchmark comparison summary for ${benchmarkDeviceType}`);

      // Fetch all activity session analyses with this benchmark device
      const analyses = await SessionAnalysis.find({
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
        activityStats: { $exists: true },
      }).populate({
        path: "sessionId",
        match: { benchmarkDeviceType },
      });

      // Filter out null sessionIds (from populate match)
      const validAnalyses = analyses.filter((a) => a.sessionId != null);

      if (validAnalyses.length === 0) {
        console.log(`[ActivitySummaryService] No activity analyses found for benchmark ${benchmarkDeviceType}`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let stepsMAESum = 0;
      let stepsMAPESum = 0;
      let stepsBiasSum = 0;
      let stepsCount = 0;

      let distanceAccuracySum = 0;
      let distanceMAPESum = 0;
      let distanceCount = 0;

      let caloriesAccuracySum = 0;
      let caloriesMAPESum = 0;
      let caloriesCount = 0;

      validAnalyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepsMAESum += activityStats.steps.mae || 0;
          stepsMAPESum += activityStats.steps.mape || 0;
          stepsBiasSum += activityStats.steps.bias || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceMAPESum += activityStats.distance.mape || 0;
          distanceCount++;
        }

        if (activityStats.calories) {
          caloriesAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesMAPESum += activityStats.calories.mape || 0;
          caloriesCount++;
        }
      });

      // Build activityStats object
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.steps = {
          avgAccuracy: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgMAE: Math.round(stepsMAESum / stepsCount),
          avgMAPE: Math.round((stepsMAPESum / stepsCount) * 100) / 100,
          avgBias: Math.round(stepsBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityStats.distance = {
          avgAccuracy: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgMAPE: Math.round((distanceMAPESum / distanceCount) * 100) / 100,
        };
      }

      if (caloriesCount > 0) {
        activityStats.calories = {
          avgAccuracy: Math.round((caloriesAccuracySum / caloriesCount) * 100) / 100,
          avgMAPE: Math.round((caloriesMAPESum / caloriesCount) * 100) / 100,
        };
      }

      // Update BenchmarkComparisonSummary for Steps metric
      await BenchmarkComparisonSummary.findOneAndUpdate(
        { benchmarkDeviceType, metric: "Steps" },
        {
          benchmarkDeviceType,
          metric: "Steps",
          totalSessions: validAnalyses.length,
          activityStats,
          lastUpdated: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivitySummaryService] ✅ Updated benchmark comparison summary for ${benchmarkDeviceType}`);
    } catch (error) {
      console.error(`[ActivitySummaryService] ❌ Error updating benchmark comparison summary:`, error);
      throw error;
    }
  }

  /**
   * Update admin global summary for activity
   * This updates the adminglobalsummaries collection
   */
  static async updateAdminGlobalSummary(): Promise<void> {
    try {
      console.log(`[ActivitySummaryService] Updating admin global summary for activity`);

      // Fetch all activity session analyses
      const analyses = await SessionAnalysis.find({
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
        activityStats: { $exists: true },
      });

      if (analyses.length === 0) {
        console.log(`[ActivitySummaryService] No activity analyses found`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let distanceAccuracySum = 0;
      let calorieAccuracySum = 0;
      let stepMAESum = 0;
      let stepMAPESum = 0;
      let stepBiasSum = 0;
      let distanceMAPESum = 0;
      let calorieMAPESum = 0;

      let stepsCount = 0;
      let distanceCount = 0;
      let caloriesCount = 0;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepMAESum += activityStats.steps.mae || 0;
          stepMAPESum += activityStats.steps.mape || 0;
          stepBiasSum += activityStats.steps.bias || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceMAPESum += activityStats.distance.mape || 0;
          distanceCount++;
        }

        if (activityStats.calories) {
          calorieAccuracySum += activityStats.calories.accuracyPercent || 0;
          calorieMAPESum += activityStats.calories.mape || 0;
          caloriesCount++;
        }
      });

      // Build activityStats object
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.stepsAccuracy = Math.round((stepsAccuracySum / stepsCount) * 100) / 100;
        activityStats.avgStepMAE = Math.round(stepMAESum / stepsCount);
        activityStats.avgStepMAPE = Math.round((stepMAPESum / stepsCount) * 100) / 100;
        activityStats.avgStepBias = Math.round(stepBiasSum / stepsCount);
      }

      if (distanceCount > 0) {
        activityStats.distanceAccuracy = Math.round((distanceAccuracySum / distanceCount) * 100) / 100;
        activityStats.avgDistanceMAPE = Math.round((distanceMAPESum / distanceCount) * 100) / 100;
      }

      if (caloriesCount > 0) {
        activityStats.calorieAccuracy = Math.round((calorieAccuracySum / caloriesCount) * 100) / 100;
        activityStats.avgCalorieMAPE = Math.round((calorieMAPESum / caloriesCount) * 100) / 100;
      }

      // Get unique user count
      const uniqueUserIds = new Set(analyses.map((a) => a.userId.toString()));
      const totalUsers = uniqueUserIds.size;

      // Update AdminGlobalSummary for Steps metric
      await AdminGlobalSummary.findOneAndUpdate(
        { metric: "Steps" },
        {
          metric: "Steps",
          totalUsers,
          totalSessions: analyses.length,
          totalReadings: 0, // Activity doesn't have individual readings
          activityStats,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivitySummaryService] ✅ Updated admin global summary for activity`);
    } catch (error) {
      console.error(`[ActivitySummaryService] ❌ Error updating admin global summary:`, error);
      throw error;
    }
  }

  /**
   * Update admin daily trend for activity
   * This updates the admindailytrends collection
   */
  static async updateAdminDailyTrend(date: Date): Promise<void> {
    try {
      console.log(`[ActivitySummaryService] Updating admin daily trend for activity on ${date}`);

      // Get date range (midnight to midnight)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch activity sessions created on this date
      const sessions = await Session.find({
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      });

      if (sessions.length === 0) {
        console.log(`[ActivitySummaryService] No activity sessions found for ${date}`);
        return;
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch analyses for these sessions
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      if (analyses.length === 0) {
        console.log(`[ActivitySummaryService] No activity analyses found for ${date}`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let distanceAccuracySum = 0;
      let calorieAccuracySum = 0;
      let stepMAESum = 0;
      let distanceMAESum = 0;

      let stepsCount = 0;
      let distanceCount = 0;
      let caloriesCount = 0;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepMAESum += activityStats.steps.mae || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceMAESum += Math.abs(activityStats.distance.errorMeters || 0);
          distanceCount++;
        }

        if (activityStats.calories) {
          calorieAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesCount++;
        }
      });

      // Build activityStats object
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.stepsAccuracy = Math.round((stepsAccuracySum / stepsCount) * 100) / 100;
        activityStats.stepMAE = Math.round(stepMAESum / stepsCount);
      }

      if (distanceCount > 0) {
        activityStats.distanceAccuracy = Math.round((distanceAccuracySum / distanceCount) * 100) / 100;
        activityStats.distanceMAE = Math.round(distanceMAESum / distanceCount);
      }

      if (caloriesCount > 0) {
        activityStats.calorieAccuracy = Math.round((calorieAccuracySum / caloriesCount) * 100) / 100;
      }

      // Get unique user count
      const uniqueUserIds = new Set(analyses.map((a) => a.userId.toString()));
      const totalUsers = uniqueUserIds.size;

      // Update AdminDailyTrend for Steps metric
      await AdminDailyTrend.findOneAndUpdate(
        { date: startOfDay, metric: "Steps" },
        {
          date: startOfDay,
          metric: "Steps",
          totalSessions: analyses.length,
          totalUsers,
          activityStats,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivitySummaryService] ✅ Updated admin daily trend for activity on ${date}`);
    } catch (error) {
      console.error(`[ActivitySummaryService] ❌ Error updating admin daily trend:`, error);
      throw error;
    }
  }

  /**
   * Update firmware performance for activity
   * This updates the firmwareperformances collection
   */
  static async updateFirmwarePerformance(firmwareVersion: string): Promise<void> {
    try {
      console.log(`[ActivitySummaryService] Updating firmware performance for ${firmwareVersion}`);

      // Fetch all activity sessions with this firmware version
      const sessions = await Session.find({
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
        "devices.firmwareVersion": firmwareVersion,
        "devices.deviceType": "luna",
      });

      if (sessions.length === 0) {
        console.log(`[ActivitySummaryService] No activity sessions found for firmware ${firmwareVersion}`);
        return;
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch analyses for these sessions
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      if (analyses.length === 0) {
        console.log(`[ActivitySummaryService] No activity analyses found for firmware ${firmwareVersion}`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let distanceAccuracySum = 0;
      let calorieAccuracySum = 0;
      let stepMAPESum = 0;
      let stepMAESum = 0;

      let stepsCount = 0;
      let distanceCount = 0;
      let caloriesCount = 0;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepMAPESum += activityStats.steps.mape || 0;
          stepMAESum += activityStats.steps.mae || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceCount++;
        }

        if (activityStats.calories) {
          calorieAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesCount++;
        }
      });

      // Build activityStats object
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.stepsAccuracy = Math.round((stepsAccuracySum / stepsCount) * 100) / 100;
        activityStats.avgStepMAPE = Math.round((stepMAPESum / stepsCount) * 100) / 100;
        activityStats.avgStepMAE = Math.round(stepMAESum / stepsCount);
        activityStats.totalSessions = analyses.length;
      }

      if (distanceCount > 0) {
        activityStats.distanceAccuracy = Math.round((distanceAccuracySum / distanceCount) * 100) / 100;
      }

      if (caloriesCount > 0) {
        activityStats.calorieAccuracy = Math.round((calorieAccuracySum / caloriesCount) * 100) / 100;
      }

      // Get unique user count
      const uniqueUserIds = new Set(analyses.map((a) => a.userId.toString()));
      const totalUsers = uniqueUserIds.size;

      // Update FirmwarePerformance for Steps metric
      await FirmwarePerformance.findOneAndUpdate(
        { firmwareVersion, metric: "Steps" },
        {
          firmwareVersion,
          metric: "Steps",
          totalSessions: analyses.length,
          totalUsers,
          activityStats,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivitySummaryService] ✅ Updated firmware performance for ${firmwareVersion}`);
    } catch (error) {
      console.error(`[ActivitySummaryService] ❌ Error updating firmware performance:`, error);
      throw error;
    }
  }
}
