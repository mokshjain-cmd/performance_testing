import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import ActivityDailyReading from "../../models/ActivityDailyReading";

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
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
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
  accuracyPercent?: number;
  lunaDistance: number;
  benchmarkDistance?: number;
  lunaCalories: number;
  benchmarkCalories?: number;
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
      // Fetch all activity sessions for this user
      const sessions = await Session.find({
        userId,
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      });

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          avgTotalSteps: 0,
          avgTotalDistance: 0,
          avgTotalCalories: 0,
        };
      }

      const sessionIds = sessions.map((s) => s._id);

      // Fetch activity analyses
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
        activityStats: { $exists: true },
      });

      // Fetch Luna daily readings to get totals
      const lunaDailyReadings = await ActivityDailyReading.find({
        sessionId: { $in: sessionIds },
        deviceType: "luna",
      });

      // Calculate averages
      let totalStepsSum = 0;
      let totalDistanceSum = 0;
      let totalCaloriesSum = 0;

      lunaDailyReadings.forEach((reading: any) => {
        totalStepsSum += reading.totals.steps || 0;
        totalDistanceSum += reading.totals.distanceMeters || 0;
        totalCaloriesSum += reading.totals.caloriesTotal || 0;
      });

      const sessionCount = sessions.length;

      // Calculate comparison metrics if analyses available
      let comparison = undefined;

      if (analyses.length > 0) {
        let stepsAccSum = 0, stepsBiasSum = 0, stepsMaeSum = 0, stepsMapeSum = 0;
        let distanceAccSum = 0, distanceBiasSum = 0, distanceMaeSum = 0, distanceMapeSum = 0;
        let caloriesAccSum = 0, caloriesBiasSum = 0, caloriesMaeSum = 0, caloriesMapeSum = 0;

        analyses.forEach((analysis: any) => {
          const stats = analysis.activityStats;
          if (stats) {
            if (stats.steps) {
              stepsAccSum += stats.steps.accuracyPercent || 0;
              stepsBiasSum += stats.steps.bias || 0;
              stepsMaeSum += stats.steps.mae || 0;
              stepsMapeSum += stats.steps.mape || 0;
            }
            if (stats.distance) {
              distanceAccSum += stats.distance.accuracyPercent || 0;
              distanceBiasSum += stats.distance.bias || 0;
              distanceMaeSum += stats.distance.mae || 0;
              distanceMapeSum += stats.distance.mape || 0;
            }
            if (stats.calories) {
              caloriesAccSum += stats.calories.accuracyPercent || 0;
              caloriesBiasSum += stats.calories.bias || 0;
              caloriesMaeSum += stats.calories.mae || 0;
              caloriesMapeSum += stats.calories.mape || 0;
            }
          }
        });

        const count = analyses.length;

        comparison = {
          steps: {
            avgAccuracyPercent: parseFloat((stepsAccSum / count).toFixed(2)),
            avgBias: parseFloat((stepsBiasSum / count).toFixed(2)),
            avgMae: parseFloat((stepsMaeSum / count).toFixed(2)),
            avgMape: parseFloat((stepsMapeSum / count).toFixed(2)),
          },
          distance: {
            avgAccuracyPercent: parseFloat((distanceAccSum / count).toFixed(2)),
            avgBias: parseFloat((distanceBiasSum / count).toFixed(2)),
            avgMae: parseFloat((distanceMaeSum / count).toFixed(2)),
            avgMape: parseFloat((distanceMapeSum / count).toFixed(2)),
          },
          calories: {
            avgAccuracyPercent: parseFloat((caloriesAccSum / count).toFixed(2)),
            avgBias: parseFloat((caloriesBiasSum / count).toFixed(2)),
            avgMae: parseFloat((caloriesMaeSum / count).toFixed(2)),
            avgMape: parseFloat((caloriesMapeSum / count).toFixed(2)),
          },
        };
      }

      return {
        totalSessions: sessionCount,
        avgTotalSteps: parseFloat((totalStepsSum / sessionCount).toFixed(0)),
        avgTotalDistance: parseFloat((totalDistanceSum / sessionCount).toFixed(2)),
        avgTotalCalories: parseFloat((totalCaloriesSum / sessionCount).toFixed(2)),
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

      const analysis = await SessionAnalysis.findOne({ sessionId });

      // Get daily readings for Luna and Benchmark
      const lunaReadings = await ActivityDailyReading.find({
        sessionId,
        deviceType: "luna",
      }).sort({ "meta.date": 1 });

      const benchmarkDevice = session.devices.find((d: any) => d.deviceType !== "luna");
      let benchmarkReadings = null;

      if (benchmarkDevice) {
        benchmarkReadings = await ActivityDailyReading.find({
          sessionId,
          deviceType: benchmarkDevice.deviceType,
        }).sort({ "meta.date": 1 });
      }

      // Calculate totals for Luna
      const lunaSteps = lunaReadings.reduce((sum: number, r: any) => sum + r.totals.steps, 0);
      const lunaDistance = lunaReadings.reduce((sum: number, r: any) => sum + r.totals.distanceMeters, 0);
      const lunaCalories = lunaReadings.reduce((sum: number, r: any) => sum + r.totals.caloriesTotal, 0);
      const lunaCaloriesActive = lunaReadings.reduce((sum: number, r: any) => sum + (r.totals.caloriesActive || 0), 0);
      const lunaCaloriesBasal = lunaReadings.reduce((sum: number, r: any) => sum + (r.totals.caloriesBasal || 0), 0);

      const result: ISingleActivitySessionView = {
        session: {
          _id: session._id.toString(),
          name: session.name,
          startTime: session.startTime,
          endTime: session.endTime,
          date: session.createdAt,
        },
        luna: {
          totalSteps: lunaSteps,
          totalDistance: lunaDistance,
          totalCalories: lunaCalories,
          caloriesActive: lunaCaloriesActive,
          caloriesBasal: lunaCaloriesBasal,
        },
      };

      // Add benchmark data if available
      if (benchmarkReadings && benchmarkReadings.length > 0 && benchmarkDevice) {
        const benchmarkSteps = benchmarkReadings.reduce((sum: number, r: any) => sum + r.totals.steps, 0);
        const benchmarkDistance = benchmarkReadings.reduce((sum: number, r: any) => sum + r.totals.distanceMeters, 0);
        const benchmarkCalories = benchmarkReadings.reduce((sum: number, r: any) => sum + r.totals.caloriesTotal, 0);
        const benchmarkCaloriesActive = benchmarkReadings.reduce((sum: number, r: any) => sum + (r.totals.caloriesActive || 0), 0);
        const benchmarkCaloriesBasal = benchmarkReadings.reduce((sum: number, r: any) => sum + (r.totals.caloriesBasal || 0), 0);

        result.benchmark = {
          deviceType: benchmarkDevice.deviceType,
          totalSteps: benchmarkSteps,
          totalDistance: benchmarkDistance,
          totalCalories: benchmarkCalories,
          caloriesActive: benchmarkCaloriesActive,
          caloriesBasal: benchmarkCaloriesBasal,
        };

        // Add comparison if analysis exists
        if (analysis && (analysis as any).activityStats) {
          result.comparison = (analysis as any).activityStats;
        }
      }

      // Add daily data if requested
      if (includeDailyData) {
        result.dailyData = {
          luna: lunaReadings.map((r: any) => ({
            date: r.meta.date,
            steps: r.totals.steps,
            distanceMeters: r.totals.distanceMeters,
            caloriesTotal: r.totals.caloriesTotal,
            caloriesActive: r.totals.caloriesActive,
            caloriesBasal: r.totals.caloriesBasal,
          })),
        };

        if (benchmarkReadings && benchmarkReadings.length > 0) {
          result.dailyData.benchmark = benchmarkReadings.map((r: any) => ({
            date: r.meta.date,
            steps: r.totals.steps,
            distanceMeters: r.totals.distanceMeters,
            caloriesTotal: r.totals.caloriesTotal,
            caloriesActive: r.totals.caloriesActive,
            caloriesBasal: r.totals.caloriesBasal,
          }));
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
        metric: { $in: ["Steps", "Calories"] },
        isValid: true,
      }).sort({ date: 1 });

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map((s) => s._id);

      // Get all daily readings
      const allReadings = await ActivityDailyReading.find({
        sessionId: { $in: sessionIds },
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
        const sessionKey = `${dateKey}-${reading.sessionId.toString()}`;

        if (!trendMap.has(sessionKey)) {
          trendMap.set(sessionKey, {
            date: reading.meta.date,
            sessionId: reading.sessionId.toString(),
            luna: { steps: 0, distance: 0, calories: 0 },
            benchmark: { steps: 0, distance: 0, calories: 0 },
          });
        }

        const entry = trendMap.get(sessionKey);

        if (reading.deviceType === "luna") {
          entry.luna.steps += reading.totals.steps;
          entry.luna.distance += reading.totals.distanceMeters;
          entry.luna.calories += reading.totals.caloriesTotal;
        } else {
          entry.benchmark.steps += reading.totals.steps;
          entry.benchmark.distance += reading.totals.distanceMeters;
          entry.benchmark.calories += reading.totals.caloriesTotal;
        }
      });

      // Convert to array and add accuracy data
      const trendData: IActivityTrendData[] = [];

      for (const [key, entry] of trendMap.entries()) {
        const analysis = analyses.find((a: any) => a.sessionId.toString() === entry.sessionId);

        trendData.push({
          date: entry.date,
          lunaSteps: entry.luna.steps,
          benchmarkSteps: entry.benchmark.steps > 0 ? entry.benchmark.steps : undefined,
          accuracyPercent: analysis?.activityStats?.steps?.accuracyPercent,
          lunaDistance: entry.luna.distance,
          benchmarkDistance: entry.benchmark.distance > 0 ? entry.benchmark.distance : undefined,
          lunaCalories: entry.luna.calories,
          benchmarkCalories: entry.benchmark.calories > 0 ? entry.benchmark.calories : undefined,
        });
      }

      return trendData.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error("[UserActivitySummaryService] Error getting activity trend:", error);
      throw error;
    }
  }
}
