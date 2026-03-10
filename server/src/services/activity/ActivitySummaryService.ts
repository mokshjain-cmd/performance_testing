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
        metric: { $in: ["Activity"] },
        isValid: true,
      });

      // If no sessions remain, delete the UserAccuracySummary document for Activity metric
      if (sessions.length === 0) {
        await UserAccuracySummary.deleteOne({ userId, metric: "Activity" });
        console.log(`[ActivitySummaryService] ✅ Deleted user activity summary for user ${userId} (no sessions remaining)`);
        return;
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch all activity session analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      // If no analyses found, update with basic session count only
      if (analyses.length === 0) {
        await UserAccuracySummary.findOneAndUpdate(
          { userId, metric: "Activity" },
          {
            userId,
            metric: "Activity",
            totalSessions: sessions.length,
            lastUpdated: new Date(),
          },
          { upsert: true, new: true }
        );
        console.log(`[ActivitySummaryService] ✅ Updated user activity summary for user ${userId} (sessions exist but no analyses yet)`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let stepsBiasSum = 0;
      let stepsCount = 0;
      let lunaStepsSum = 0;

      let distanceAccuracySum = 0;
      let distanceBiasSum = 0;
      let distanceCount = 0;
      let lunaDistanceSum = 0;

      let caloriesAccuracySum = 0;
      let caloriesBiasSum = 0;
      let caloriesCount = 0;
      let lunaCaloriesSum = 0;

      let activeCaloriesAccuracySum = 0;
      let activeCaloriesBiasSum = 0;
      let activeCaloriesCount = 0;

      let basalCaloriesAccuracySum = 0;
      let basalCaloriesBiasSum = 0;
      let basalCaloriesCount = 0;

      let bestSession: any = null;
      let worstSession: any = null;

      analyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        // Steps stats
        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepsBiasSum += activityStats.steps.bias || 0;
          lunaStepsSum += activityStats.steps.lunaTotal || 0;
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
          distanceBiasSum += activityStats.distance.bias || 0;
          lunaDistanceSum += activityStats.distance.lunaMeters || 0;
          distanceCount++;
        }

        // Calories stats
        if (activityStats.calories) {
          caloriesAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesBiasSum += activityStats.calories.bias || 0;
          lunaCaloriesSum += activityStats.calories.lunaTotal || 0;
          caloriesCount++;
        }

        // Active calories stats
        if (activityStats.activeCalories) {
          activeCaloriesAccuracySum += activityStats.activeCalories.accuracyPercent || 0;
          activeCaloriesBiasSum += activityStats.activeCalories.bias || 0;
          activeCaloriesCount++;
        }

        // Basal calories stats
        if (activityStats.basalCalories) {
          basalCaloriesAccuracySum += activityStats.basalCalories.accuracyPercent || 0;
          basalCaloriesBiasSum += activityStats.basalCalories.bias || 0;
          basalCaloriesCount++;
        }
      });

      // Build activityOverview object
      const activityOverview: any = {
        avgDailySteps: stepsCount > 0 ? Math.round(lunaStepsSum / stepsCount) : 0,
        avgDailyDistance: distanceCount > 0 ? Math.round(lunaDistanceSum / distanceCount) : 0,
        avgDailyCalories: caloriesCount > 0 ? Math.round(lunaCaloriesSum / caloriesCount) : 0,
      };

      if (stepsCount > 0) {
        activityOverview.steps = {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepsBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityOverview.distance = {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        };
      }

      if (caloriesCount > 0) {
        activityOverview.calories = {
          avgAccuracyPercent: Math.round((caloriesAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(caloriesBiasSum / caloriesCount),
        };
      }

      if (activeCaloriesCount > 0) {
        activityOverview.activeCalories = {
          avgAccuracyPercent: Math.round((activeCaloriesAccuracySum / activeCaloriesCount) * 100) / 100,
          avgDifference: Math.round(activeCaloriesBiasSum / activeCaloriesCount),
        };
      }

      if (basalCaloriesCount > 0) {
        activityOverview.basalCalories = {
          avgAccuracyPercent: Math.round((basalCaloriesAccuracySum / basalCaloriesCount) * 100) / 100,
          avgDifference: Math.round(basalCaloriesBiasSum / basalCaloriesCount),
        };
      }

      // Update UserAccuracySummary for Activity metric
      await UserAccuracySummary.findOneAndUpdate(
        { userId, metric: "Activity" },
        {
          userId,
          metric: "Activity",
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
        metric: "Activity",
        isValid: true,
        activityStats: { $exists: true },
      }).populate({
        path: "sessionId",
        match: { benchmarkDeviceType },
      });

      // Filter out null sessionIds (from populate match)
      const validAnalyses = analyses.filter((a) => a.sessionId != null);

      // If no analyses remain, delete the BenchmarkComparisonSummary document
      if (validAnalyses.length === 0) {
        await BenchmarkComparisonSummary.deleteOne({ benchmarkDeviceType, metric: "Activity" });
        console.log(`[ActivitySummaryService] ✅ Deleted benchmark comparison summary for ${benchmarkDeviceType} (no sessions remaining)`);
        return;
      }

      // Calculate aggregates
      let stepsAccuracySum = 0;
      let stepsBiasSum = 0;
      let stepsCount = 0;

      let distanceAccuracySum = 0;
      let distanceBiasSum = 0;
      let distanceCount = 0;

      let caloriesAccuracySum = 0;
      let caloriesBiasSum = 0;
      let caloriesCount = 0;

      let activeCaloriesAccuracySum = 0;
      let activeCaloriesBiasSum = 0;
      let activeCaloriesCount = 0;

      let basalCaloriesAccuracySum = 0;
      let basalCaloriesBiasSum = 0;
      let basalCaloriesCount = 0;

      validAnalyses.forEach((analysis) => {
        const activityStats = analysis.activityStats;
        if (!activityStats) return;

        if (activityStats.steps) {
          stepsAccuracySum += activityStats.steps.accuracyPercent || 0;
          stepsBiasSum += activityStats.steps.bias || 0;
          stepsCount++;
        }

        if (activityStats.distance) {
          distanceAccuracySum += activityStats.distance.accuracyPercent || 0;
          distanceBiasSum += activityStats.distance.bias || 0;
          distanceCount++;
        }

        if (activityStats.calories) {
          caloriesAccuracySum += activityStats.calories.accuracyPercent || 0;
          caloriesBiasSum += activityStats.calories.bias || 0;
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
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.steps = {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepsBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityStats.distance = {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        };
      }

      if (caloriesCount > 0) {
        activityStats.calories = {
          avgAccuracyPercent: Math.round((caloriesAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(caloriesBiasSum / caloriesCount),
        };
      }

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

      // Update BenchmarkComparisonSummary for Activity metric
      await BenchmarkComparisonSummary.findOneAndUpdate(
        { benchmarkDeviceType, metric: "Activity" },
        {
          benchmarkDeviceType,
          metric: "Activity",
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
        metric: "Activity",
        isValid: true,
        activityStats: { $exists: true },
      });

      // If no analyses remain, delete the AdminGlobalSummary document
      if (analyses.length === 0) {
        await AdminGlobalSummary.deleteOne({ metric: "Activity" });
        console.log(`[ActivitySummaryService] ✅ Deleted admin global summary for activity (no sessions remaining)`);
        return;
      }

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
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.steps = {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityStats.distance = {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        };
      }

      if (caloriesCount > 0) {
        activityStats.calories = {
          avgAccuracyPercent: Math.round((calorieAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(calorieBiasSum / caloriesCount),
        };
      }

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
      const totalUsers = uniqueUserIds.size;

      // Update AdminGlobalSummary for Activity metric
      await AdminGlobalSummary.findOneAndUpdate(
        { metric: "Activity" },
        {
          metric: "Activity",
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

      // Fetch activity sessions that occurred on this date (by startTime)
      const sessions = await Session.find({
        metric: "Activity",
        isValid: true,
        startTime: { $gte: startOfDay, $lte: endOfDay },
      });

      const sessionIds = sessions.map((s) => s._id);

      // Fetch analyses for these sessions
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      // If no analyses remain, delete the AdminDailyTrend document for this date
      if (analyses.length === 0) {
        await AdminDailyTrend.deleteOne({ date: startOfDay, metric: "Activity" });
        console.log(`[ActivitySummaryService] ✅ Deleted admin daily trend for activity on ${date} (no sessions remaining)`);
        return;
      }

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
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.steps = {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityStats.distance = {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        };
      }

      if (caloriesCount > 0) {
        activityStats.calories = {
          avgAccuracyPercent: Math.round((calorieAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(calorieBiasSum / caloriesCount),
        };
      }

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
      const totalUsers = uniqueUserIds.size;

      // Update AdminDailyTrend for Activity metric
      await AdminDailyTrend.findOneAndUpdate(
        { date: startOfDay, metric: "Activity" },
        {
          date: startOfDay,
          metric: "Activity",
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
        metric: "Activity",
        isValid: true,
        "devices.firmwareVersion": firmwareVersion,
        "devices.deviceType": "luna",
      });

      const sessionIds = sessions.map((s) => s._id);

      // Fetch analyses for these sessions
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        isValid: true,
        activityStats: { $exists: true },
      });

      // If no analyses remain, delete the FirmwarePerformance document for this firmware
      if (analyses.length === 0) {
        await FirmwarePerformance.deleteOne({ firmwareVersion, metric: "Activity" });
        console.log(`[ActivitySummaryService] ✅ Deleted firmware performance for ${firmwareVersion} (no sessions remaining)`);
        return;
      }

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
      const activityStats: any = {};

      if (stepsCount > 0) {
        activityStats.steps = {
          avgAccuracyPercent: Math.round((stepsAccuracySum / stepsCount) * 100) / 100,
          avgDifference: Math.round(stepBiasSum / stepsCount),
        };
      }

      if (distanceCount > 0) {
        activityStats.distance = {
          avgAccuracyPercent: Math.round((distanceAccuracySum / distanceCount) * 100) / 100,
          avgDifference: Math.round(distanceBiasSum / distanceCount),
        };
      }

      if (caloriesCount > 0) {
        activityStats.calories = {
          avgAccuracyPercent: Math.round((calorieAccuracySum / caloriesCount) * 100) / 100,
          avgDifference: Math.round(calorieBiasSum / caloriesCount),
        };
      }

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
      const totalUsers = uniqueUserIds.size;

      // Update FirmwarePerformance for Activity metric
      await FirmwarePerformance.findOneAndUpdate(
        { firmwareVersion, metric: "Activity" },
        {
          firmwareVersion,
          metric: "Activity",
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
