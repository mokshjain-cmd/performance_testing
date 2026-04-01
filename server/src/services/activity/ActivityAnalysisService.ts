import { Types } from "mongoose";
import Session from "../../models/Session";
import ActivityDailyReading from "../../models/ActivityDailyReading";
import SessionAnalysis from "../../models/SessionAnalysis";

/**
 * ActivityAnalysisService
 * Computes session-level activity analysis metrics
 */
export class ActivityAnalysisService {
  /**
   * Analyze an activity session
   * This is called after daily totals have been ingested
   */
  static async analyzeSession(sessionId: Types.ObjectId | string): Promise<void> {
    try {
      console.log(`[ActivityAnalysisService] Analyzing session: ${sessionId}`);

      const session = await Session.findById(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.metric !== "Activity") {
        throw new Error(`Session ${sessionId} is not an activity session`);
      }

      // Fetch Luna daily readings
      const lunaReadings = await ActivityDailyReading.find({
        "meta.sessionId": sessionId,
        "meta.deviceType": "luna",
      }).sort({ "meta.date": 1 });
      console.log(`[ActivityAnalysisService] 📊 Found ${lunaReadings.length} Luna daily readings`);

      // Fetch benchmark device daily readings (if available)
      const benchmarkDeviceType = session.benchmarkDeviceType;
      let benchmarkReadings: any[] = [];
      if (benchmarkDeviceType) {
        benchmarkReadings = await ActivityDailyReading.find({
          "meta.sessionId": sessionId,
          "meta.deviceType": benchmarkDeviceType,
        }).sort({ "meta.date": 1 });
        console.log(`[ActivityAnalysisService] 📊 Found ${benchmarkReadings.length} ${benchmarkDeviceType} daily readings`);
      }

      // Calculate Luna totals
      const lunaTotals = this.calculateTotals(lunaReadings);
      console.log(`[ActivityAnalysisService] Luna totals:`, lunaTotals);

      // Calculate benchmark totals (if available)
      let benchmarkTotals: any = null;
      if (benchmarkReadings.length > 0) {
        benchmarkTotals = this.calculateTotals(benchmarkReadings);
        console.log(`[ActivityAnalysisService] ${benchmarkDeviceType} totals:`, benchmarkTotals);
      }

      // Calculate comparison metrics if both devices present
      let activityStats: any = {};

      if (benchmarkTotals && lunaTotals) {
        activityStats = this.calculateActivityStats(lunaTotals, benchmarkTotals);
        console.log(`[ActivityAnalysisService] ✅ Activity stats computed:`, activityStats);
      }

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
          activityStats,
          lunaAccuracyPercent: activityStats.steps?.accuracyPercent || undefined,
          isValid: session.isValid,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );

      console.log(`[ActivityAnalysisService] ✅ Session analysis completed for ${sessionId}`);
    } catch (error) {
      console.error(`[ActivityAnalysisService] ❌ Error analyzing session:`, error);
      throw error;
    }
  }

  /**
   * Calculate totals from daily readings
   */
  private static calculateTotals(readings: any[]): {
    steps: number;
    distanceMeters: number;
    caloriesTotal: number | null;
    caloriesActive: number | null;
    caloriesBasal: number | null;
  } {
    let steps = 0;
    let distanceMeters = 0;
    let caloriesTotal: number | null = null;
    let caloriesActive: number | null = null;
    let caloriesBasal: number | null = null;

    // For steps and distance, sum them up
    readings.forEach((reading) => {
      steps += reading.totals.steps || 0;
      distanceMeters += reading.totals.distanceMeters || 0;
    });

    // For calories, preserve null if ALL readings are null, otherwise sum non-null values
    let hasCaloriesTotal = false;
    let hasCaloriesActive = false;
    let hasCaloriesBasal = false;
    let totalSum = 0;
    let activeSum = 0;
    let basalSum = 0;

    readings.forEach((reading) => {
      if (reading.totals.caloriesTotal !== null && reading.totals.caloriesTotal !== undefined) {
        hasCaloriesTotal = true;
        totalSum += reading.totals.caloriesTotal;
      }
      if (reading.totals.caloriesActive !== null && reading.totals.caloriesActive !== undefined) {
        hasCaloriesActive = true;
        activeSum += reading.totals.caloriesActive;
      }
      if (reading.totals.caloriesBasal !== null && reading.totals.caloriesBasal !== undefined) {
        hasCaloriesBasal = true;
        basalSum += reading.totals.caloriesBasal;
      }
    });

    return {
      steps,
      distanceMeters,
      caloriesTotal: hasCaloriesTotal ? totalSum : null,
      caloriesActive: hasCaloriesActive ? activeSum : null,
      caloriesBasal: hasCaloriesBasal ? basalSum : null,
    };
  }

  /**
   * Calculate activity stats (comparison between Luna and benchmark)
   */
  private static calculateActivityStats(
    lunaTotals: any,
    benchmarkTotals: any
  ): any {
    const activityStats: any = {};

    // Steps stats
    if (benchmarkTotals.steps > 0) {
      const error = lunaTotals.steps - benchmarkTotals.steps;
      const mae = Math.abs(error);
      const mape = Math.abs(error / benchmarkTotals.steps) * 100;
      const accuracyPercent = Math.max(0, (1 - Math.abs(error) / benchmarkTotals.steps) * 100);
      const bias = error;
      const ratio = lunaTotals.steps / benchmarkTotals.steps;
      const rmse = Math.sqrt(Math.pow(error, 2)); // For single data point, RMSE = |error|

      activityStats.steps = {
        lunaTotal: lunaTotals.steps,
        benchmarkTotal: benchmarkTotals.steps,
        error,
        accuracyPercent: Math.round(accuracyPercent * 100) / 100,
        mae: Math.round(mae),
        mape: Math.round(mape * 100) / 100,
        rmse: Math.round(rmse),
        bias: Math.round(bias),
        ratio: Math.round(ratio * 1000) / 1000,
      };
    }

    // Distance stats
    if (benchmarkTotals.distanceMeters > 0) {
      const errorMeters = lunaTotals.distanceMeters - benchmarkTotals.distanceMeters;
      const mape = Math.abs(errorMeters / benchmarkTotals.distanceMeters) * 100;
      const accuracyPercent = Math.max(0, (1 - Math.abs(errorMeters) / benchmarkTotals.distanceMeters) * 100);

      activityStats.distance = {
        lunaMeters: Math.round(lunaTotals.distanceMeters),
        benchmarkMeters: Math.round(benchmarkTotals.distanceMeters),
        errorMeters: Math.round(errorMeters),
        accuracyPercent: Math.round(accuracyPercent * 100) / 100,
        mape: Math.round(mape * 100) / 100,
        bias: Math.round(errorMeters),
        mae: Math.round(Math.abs(errorMeters)),
      };
    }

    // Total calories stats - store values even if can't calculate comparison
    if (lunaTotals.caloriesTotal !== null || benchmarkTotals.caloriesTotal !== null) {
      activityStats.calories = {
        lunaTotal: lunaTotals.caloriesTotal !== null ? Math.round(lunaTotals.caloriesTotal) : null,
        benchmarkTotal: benchmarkTotals.caloriesTotal !== null ? Math.round(benchmarkTotals.caloriesTotal) : null,
      };

      // Only calculate comparison metrics if both values exist
      if (benchmarkTotals.caloriesTotal && benchmarkTotals.caloriesTotal > 0 && lunaTotals.caloriesTotal) {
        const error = lunaTotals.caloriesTotal - benchmarkTotals.caloriesTotal;
        const mape = Math.abs(error / benchmarkTotals.caloriesTotal) * 100;
        const accuracyPercent = Math.max(0, (1 - Math.abs(error) / benchmarkTotals.caloriesTotal) * 100);

        activityStats.calories.error = Math.round(error);
        activityStats.calories.accuracyPercent = Math.round(accuracyPercent * 100) / 100;
        activityStats.calories.mape = Math.round(mape * 100) / 100;
        activityStats.calories.bias = Math.round(error);
        activityStats.calories.mae = Math.round(Math.abs(error));
      }
    }

    // Active calories stats - store values even if can't calculate comparison
    if (lunaTotals.caloriesActive !== null || benchmarkTotals.caloriesActive !== null) {
      activityStats.activeCalories = {
        lunaActive: lunaTotals.caloriesActive !== null ? Math.round(lunaTotals.caloriesActive) : null,
        benchmarkActive: benchmarkTotals.caloriesActive !== null ? Math.round(benchmarkTotals.caloriesActive) : null,
      };

      // Only calculate comparison metrics if both values exist
      if (benchmarkTotals.caloriesActive && benchmarkTotals.caloriesActive > 0 && lunaTotals.caloriesActive) {
        const error = lunaTotals.caloriesActive - benchmarkTotals.caloriesActive;
        const mape = Math.abs(error / benchmarkTotals.caloriesActive) * 100;
        const accuracyPercent = Math.max(
          0,
          (1 - Math.abs(error) / benchmarkTotals.caloriesActive) * 100
        );

        activityStats.activeCalories.accuracyPercent = Math.round(accuracyPercent * 100) / 100;
        activityStats.activeCalories.bias = Math.round(error);
        activityStats.activeCalories.mae = Math.round(Math.abs(error));
        activityStats.activeCalories.mape = Math.round(mape * 100) / 100;
      }
    }

    // Basal calories stats - store values even if can't calculate comparison
    if (lunaTotals.caloriesBasal !== null || benchmarkTotals.caloriesBasal !== null) {
      activityStats.basalCalories = {
        lunaBasal: lunaTotals.caloriesBasal !== null ? Math.round(lunaTotals.caloriesBasal) : null,
        benchmarkBasal: benchmarkTotals.caloriesBasal !== null ? Math.round(benchmarkTotals.caloriesBasal) : null,
      };

      // Only calculate comparison metrics if both values exist
      if (benchmarkTotals.caloriesBasal && benchmarkTotals.caloriesBasal > 0 && lunaTotals.caloriesBasal) {
        const error = lunaTotals.caloriesBasal - benchmarkTotals.caloriesBasal;
        const mape = Math.abs(error / benchmarkTotals.caloriesBasal) * 100;
        const accuracyPercent = Math.max(
          0,
          (1 - Math.abs(error) / benchmarkTotals.caloriesBasal) * 100
        );

        activityStats.basalCalories.accuracyPercent = Math.round(accuracyPercent * 100) / 100;
        activityStats.basalCalories.bias = Math.round(error);
        activityStats.basalCalories.mae = Math.round(Math.abs(error));
        activityStats.basalCalories.mape = Math.round(mape * 100) / 100;
      }
    }

    return activityStats;
  }

  /**
   * Delete session analysis for an activity session
   */
  static async deleteSessionAnalysis(sessionId: Types.ObjectId | string): Promise<void> {
    try {
      await SessionAnalysis.deleteOne({ sessionId });
      console.log(`[ActivityAnalysisService] Deleted session analysis for ${sessionId}`);
    } catch (error) {
      console.error(`[ActivityAnalysisService] Error deleting session analysis:`, error);
      throw error;
    }
  }
}
