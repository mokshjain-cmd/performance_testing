import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import ActivityDailyReading from "../../models/ActivityDailyReading";
import UserAccuracySummary from "../../models/UserAccuracySummary";

interface IUserActivityOverview {
  totalSessions: number;
  
  // Core Activity Metrics (averages across all sessions)
  avgTotalSteps: number;
  avgTotalDistance: number; // in meters
  avgTotalCalories: number;
  
  // Comparison Metrics (If Benchmark Available)
  comparison?: {
    steps: {
      avgAccuracyPercent: number;
      avgDifference: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgDifference: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgDifference: number;
    };
    activeCalories?: {
      avgAccuracyPercent: number;
      avgDifference: number;
    };
    basalCalories?: {
      avgAccuracyPercent: number;
      avgDifference: number;
    };
  };
}

interface ISingleActivitySessionView {
  session: {
    _id: string;
    name?: string;
    startTime: Date;
    endTime: Date;
    date: Date;
  };
  
  // Luna metrics
  luna: {
    totalSteps: number;
    totalDistance: number; // meters
    totalCalories: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };
  
  // Benchmark metrics (if available)
  benchmark?: {
    deviceType: string;
    totalSteps: number;
    totalDistance: number;
    totalCalories: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };
  
  // Comparison (if benchmark available)
  comparison?: {
    steps: {
      accuracyPercent: number;
      bias: number;
      mae: number;
      mape: number;
      rmse: number;
      ratio: number;
    };
    distance: {
      accuracyPercent: number;
      bias: number;
      mae: number;
      mape: number;
      rmse: number;
      ratio: number;
    };
    calories: {
      accuracyPercent: number;
      bias: number;
      mae: number;
      mape: number;
      rmse: number;
      ratio: number;
    };
    activeCalories?: {
      accuracyPercent: number;
      bias: number;
      mae: number;
      mape: number;
      rmse: number;
      ratio: number;
    };
    basalCalories?: {
      accuracyPercent: number;
      bias: number;
      mae: number;
      mape: number;
      rmse: number;
      ratio: number;
    };
  };
  
  // Daily data (if requested)
  dailyData?: {
    luna: IDailyActivityData[];
    benchmark?: IDailyActivityData[];
  };
}

interface IDailyActivityData {
  date: Date;
  steps: number;
  distanceMeters: number;
  caloriesTotal: number;
  caloriesActive?: number;
  caloriesBasal?: number;
}

interface IActivityTrendData {
  date: Date;
  lunaSteps: number;
  benchmarkSteps?: number;
  stepsBias?: number;
  stepsAccuracyPercent?: number;
  lunaDistance: number;
  benchmarkDistance?: number;
  distanceBias?: number;
  distanceAccuracyPercent?: number;
  lunaCalories: number;
  benchmarkCalories?: number;
  caloriesBias?: number;
  caloriesAccuracyPercent?: number;
  lunaCaloriesActive?: number;
  benchmarkCaloriesActive?: number;
  activeCaloriesBias?: number;
  activeCaloriesAccuracyPercent?: number;
  lunaCaloriesBasal?: number;
  benchmarkCaloriesBasal?: number;
  basalCaloriesBias?: number;
  basalCaloriesAccuracyPercent?: number;
}

/**
 * UserActivitySummaryService
 * Provides user-facing activity insights
 */
export class UserActivitySummaryService {
  /**
   * Get user activity overview (across all sessions)
   */
  static async getUserActivityOverview(userId: Types.ObjectId | string): Promise<IUserActivityOverview> {
    try {
      // Fetch from cache first
      const summary = await UserAccuracySummary.findOne({
        userId,
        metric: "Activity",
      });

      // If no summary exists, return empty data
      if (!summary || !summary.activityOverview) {
        return {
          totalSessions: 0,
          avgTotalSteps: 0,
          avgTotalDistance: 0,
          avgTotalCalories: 0,
        };
      }

      const activityOverview = summary.activityOverview;

      // Build comparison from cached data
      let comparison = undefined;
      
      if (activityOverview.steps || activityOverview.distance || activityOverview.calories) {
        comparison = {
          steps: {
            avgAccuracyPercent: activityOverview.steps?.avgAccuracyPercent || 0,
            avgDifference: activityOverview.steps?.avgDifference || 0,
          },
          distance: {
            avgAccuracyPercent: activityOverview.distance?.avgAccuracyPercent || 0,
            avgDifference: activityOverview.distance?.avgDifference || 0,
          },
          calories: {
            avgAccuracyPercent: activityOverview.calories?.avgAccuracyPercent || 0,
            avgDifference: activityOverview.calories?.avgDifference || 0,
          },
          activeCalories: activityOverview.activeCalories ? {
            avgAccuracyPercent: activityOverview.activeCalories.avgAccuracyPercent || 0,
            avgDifference: activityOverview.activeCalories.avgDifference || 0,
          } : undefined,
          basalCalories: activityOverview.basalCalories ? {
            avgAccuracyPercent: activityOverview.basalCalories.avgAccuracyPercent || 0,
            avgDifference: activityOverview.basalCalories.avgDifference || 0,
          } : undefined,
        };
      }

      return {
        totalSessions: summary.totalSessions || 0,
        avgTotalSteps: activityOverview.avgDailySteps || 0,
        avgTotalDistance: activityOverview.avgDailyDistance || 0,
        avgTotalCalories: activityOverview.avgDailyCalories || 0,
        comparison,
      };
    } catch (error) {
      console.error("[UserActivitySummaryService] Error getting user activity overview:", error);
      throw error;
    }
  }

  /**
   * Get single activity session detailed view
   */
  static async getSingleSessionView(
    sessionId: Types.ObjectId | string,
    includeDailyData: boolean = true
  ): Promise<ISingleActivitySessionView> {
    try {
      const session = await Session.findById(sessionId);

      if (!session) {
        throw new Error("Activity session not found");
      }

      if (session.metric !== "Activity") {
        throw new Error("Not an activity session");
      }

      const analysis = await SessionAnalysis.findOne({ sessionId });

      if (!analysis || !analysis.activityStats) {
        throw new Error("Activity analysis not available for this session");
      }

      const activityStats = analysis.activityStats;

      // Build Luna data from analysis
      const result: ISingleActivitySessionView = {
        session: {
          _id: session._id.toString(),
          name: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.startTime,
        },
        luna: {
          totalSteps: activityStats.steps?.lunaTotal || 0,
          totalDistance: activityStats.distance?.lunaMeters || 0,
          totalCalories: activityStats.calories?.lunaTotal || 0,
          caloriesActive: activityStats.activeCalories?.lunaActive || 0,
          caloriesBasal: activityStats.basalCalories?.lunaBasal || 0,
        },
      };

      // Add benchmark data if available
      if (activityStats.steps?.benchmarkTotal !== undefined) {
        result.benchmark = {
          deviceType: session.benchmarkDeviceType || 'unknown',
          totalSteps: activityStats.steps.benchmarkTotal,
          totalDistance: activityStats.distance?.benchmarkMeters || 0,
          totalCalories: activityStats.calories?.benchmarkTotal || 0,
          caloriesActive: activityStats.activeCalories?.benchmarkActive || 0,
          caloriesBasal: activityStats.basalCalories?.benchmarkBasal || 0,
        };

        // Build comparison object with just the metrics (not luna/benchmark totals)
        result.comparison = {
          steps: {
            accuracyPercent: activityStats.steps.accuracyPercent || 0,
            bias: activityStats.steps.bias || 0,
            mae: activityStats.steps.mae || 0,
            mape: activityStats.steps.mape || 0,
            rmse: activityStats.steps.rmse || 0,
            ratio: activityStats.steps.ratio || 0,
          },
          distance: {
            accuracyPercent: activityStats.distance?.accuracyPercent || 0,
            bias: activityStats.distance?.bias || 0,
            mae: activityStats.distance?.mae || 0,
            mape: activityStats.distance?.mape || 0,
            rmse: 0, // Not calculated for distance
            ratio: 0, // Not calculated for distance
          },
          calories: {
            accuracyPercent: activityStats.calories?.accuracyPercent || 0,
            bias: activityStats.calories?.bias || 0,
            mae: activityStats.calories?.mae || 0,
            mape: activityStats.calories?.mape || 0,
            rmse: 0, // Not calculated for calories
            ratio: 0, // Not calculated for calories
          },
        };

        // Add active calories comparison if available
        if (activityStats.activeCalories) {
          result.comparison.activeCalories = {
            accuracyPercent: activityStats.activeCalories.accuracyPercent || 0,
            bias: activityStats.activeCalories.bias || 0,
            mae: activityStats.activeCalories.mae || 0,
            mape: activityStats.activeCalories.mape || 0,
            rmse: 0,
            ratio: 0,
          };
        }

        // Add basal calories comparison if available
        if (activityStats.basalCalories) {
          result.comparison.basalCalories = {
            accuracyPercent: activityStats.basalCalories.accuracyPercent || 0,
            bias: activityStats.basalCalories.bias || 0,
            mae: activityStats.basalCalories.mae || 0,
            mape: activityStats.basalCalories.mape || 0,
            rmse: 0,
            ratio: 0,
          };
        }
      }

      // Add daily data if requested
      if (includeDailyData) {
        const lunaReadings = await ActivityDailyReading.find({
          "meta.sessionId": sessionId,
          "meta.deviceType": "luna",
        }).sort({ "meta.date": 1 });

        result.dailyData = {
          luna: lunaReadings.map((r: any) => ({
            date: r.meta.date,
            steps: r.totals.steps || 0,
            distanceMeters: r.totals.distanceMeters || 0,
            caloriesTotal: r.totals.caloriesTotal || 0,
            caloriesActive: r.totals.caloriesActive || 0,
            caloriesBasal: r.totals.caloriesBasal || 0,
          })),
        };

        if (session.benchmarkDeviceType) {
          const benchmarkReadings = await ActivityDailyReading.find({
            "meta.sessionId": sessionId,
            "meta.deviceType": session.benchmarkDeviceType,
          }).sort({ "meta.date": 1 });

          if (benchmarkReadings.length > 0) {
            result.dailyData.benchmark = benchmarkReadings.map((r: any) => ({
              date: r.meta.date,
              steps: r.totals.steps || 0,
              distanceMeters: r.totals.distanceMeters || 0,
              caloriesTotal: r.totals.caloriesTotal || 0,
              caloriesActive: r.totals.caloriesActive || 0,
              caloriesBasal: r.totals.caloriesBasal || 0,
            }));
          }
        }
      }

      return result;
    } catch (error) {
      console.error("[UserActivitySummaryService] Error getting single session view:", error);
      throw error;
    }
  }

  /**
   * Get activity trend data for charts
   */
  static async getActivityTrend(userId: Types.ObjectId | string): Promise<IActivityTrendData[]> {
    try {
      const sessions = await Session.find({
        userId,
        metric: "Activity",
        isValid: true,
      }).sort({ date: 1 });

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map((s) => s._id);

      // Get all daily readings
      const allReadings = await ActivityDailyReading.find({
        "meta.sessionId": { $in: sessionIds },
      }).sort({ "meta.date": 1 });

      // Get analyses for accuracy data
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        activityStats: { $exists: true },
      });

      // Group by date and session
      const trendMap = new Map<string, any>();

      allReadings.forEach((reading: any) => {
        const dateKey = reading.meta.date.toISOString().split("T")[0];
        const sessionKey = `${dateKey}-${reading.meta.sessionId.toString()}`;

        if (!trendMap.has(sessionKey)) {
          trendMap.set(sessionKey, {
            date: reading.meta.date,
            sessionId: reading.meta.sessionId.toString(),
            luna: { steps: 0, distance: 0, calories: 0, caloriesActive: 0, caloriesBasal: 0 },
            benchmark: { steps: 0, distance: 0, calories: 0, caloriesActive: 0, caloriesBasal: 0 },
          });
        }

        const entry = trendMap.get(sessionKey);

        if (reading.meta.deviceType === "luna") {
          entry.luna.steps += reading.totals.steps || 0;
          entry.luna.distance += reading.totals.distanceMeters || 0;
          entry.luna.calories += reading.totals.caloriesTotal || 0;
          entry.luna.caloriesActive += reading.totals.caloriesActive || 0;
          entry.luna.caloriesBasal += reading.totals.caloriesBasal || 0;
        } else {
          entry.benchmark.steps += reading.totals.steps || 0;
          entry.benchmark.distance += reading.totals.distanceMeters || 0;
          entry.benchmark.calories += reading.totals.caloriesTotal || 0;
          entry.benchmark.caloriesActive += reading.totals.caloriesActive || 0;
          entry.benchmark.caloriesBasal += reading.totals.caloriesBasal || 0;
        }
      });

      // Convert to array and add accuracy data
      const trendData: IActivityTrendData[] = [];

      for (const [key, entry] of trendMap.entries()) {
        const analysis = analyses.find((a: any) => a.sessionId.toString() === entry.sessionId);

        // Calculate bias and accuracy for each metric
        const hasBenchmark = entry.benchmark.steps > 0 || entry.benchmark.distance > 0 || entry.benchmark.calories > 0;
        
        const stepsBias = hasBenchmark && entry.benchmark.steps > 0 ? entry.luna.steps - entry.benchmark.steps : undefined;
        const stepsAccuracyPercent = analysis?.activityStats?.steps?.accuracyPercent;
        
        const distanceBias = hasBenchmark && entry.benchmark.distance > 0 ? entry.luna.distance - entry.benchmark.distance : undefined;
        const distanceAccuracyPercent = analysis?.activityStats?.distance?.accuracyPercent;
        
        const caloriesBias = hasBenchmark && entry.benchmark.calories > 0 ? entry.luna.calories - entry.benchmark.calories : undefined;
        const caloriesAccuracyPercent = analysis?.activityStats?.calories?.accuracyPercent;
        
        const activeCaloriesBias = hasBenchmark && entry.benchmark.caloriesActive > 0 ? entry.luna.caloriesActive - entry.benchmark.caloriesActive : undefined;
        const activeCaloriesAccuracyPercent = analysis?.activityStats?.activeCalories?.accuracyPercent;
        
        const basalCaloriesBias = hasBenchmark && entry.benchmark.caloriesBasal > 0 ? entry.luna.caloriesBasal - entry.benchmark.caloriesBasal : undefined;
        const basalCaloriesAccuracyPercent = analysis?.activityStats?.basalCalories?.accuracyPercent;

        trendData.push({
          date: entry.date,
          lunaSteps: entry.luna.steps,
          benchmarkSteps: entry.benchmark.steps > 0 ? entry.benchmark.steps : undefined,
          stepsBias,
          stepsAccuracyPercent,
          lunaDistance: entry.luna.distance,
          benchmarkDistance: entry.benchmark.distance > 0 ? entry.benchmark.distance : undefined,
          distanceBias,
          distanceAccuracyPercent,
          lunaCalories: entry.luna.calories,
          benchmarkCalories: entry.benchmark.calories > 0 ? entry.benchmark.calories : undefined,
          caloriesBias,
          caloriesAccuracyPercent,
          lunaCaloriesActive: entry.luna.caloriesActive > 0 ? entry.luna.caloriesActive : undefined,
          benchmarkCaloriesActive: entry.benchmark.caloriesActive > 0 ? entry.benchmark.caloriesActive : undefined,
          activeCaloriesBias,
          activeCaloriesAccuracyPercent,
          lunaCaloriesBasal: entry.luna.caloriesBasal > 0 ? entry.luna.caloriesBasal : undefined,
          benchmarkCaloriesBasal: entry.benchmark.caloriesBasal > 0 ? entry.benchmark.caloriesBasal : undefined,
          basalCaloriesBias,
          basalCaloriesAccuracyPercent,
        });
      }

      return trendData.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error("[UserActivitySummaryService] Error getting activity trend:", error);
      throw error;
    }
  }
}
