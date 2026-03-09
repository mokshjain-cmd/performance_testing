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

      if (session.metric !== "Steps" && session.metric !== "Calories") {
        throw new Error(`Session ${sessionId} is not an activity session (Steps/Calories)`);
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
    caloriesTotal: number;
    caloriesActive: number;
    caloriesBasal: number;
  } {
    const totals = {
      steps: 0,
      distanceMeters: 0,
      caloriesTotal: 0,
      caloriesActive: 0,
      caloriesBasal: 0,
    };

    readings.forEach((reading) => {
      totals.steps += reading.totals.steps || 0;
      totals.distanceMeters += reading.totals.distanceMeters || 0;
      totals.caloriesTotal += reading.totals.caloriesTotal || 0;
      totals.caloriesActive += reading.totals.caloriesActive || 0;
      totals.caloriesBasal += reading.totals.caloriesBasal || 0;
    });

    return totals;
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
      };
    }

    // Total calories stats
    if (benchmarkTotals.caloriesTotal > 0) {
      const error = lunaTotals.caloriesTotal - benchmarkTotals.caloriesTotal;
      const mape = Math.abs(error / benchmarkTotals.caloriesTotal) * 100;
      const accuracyPercent = Math.max(0, (1 - Math.abs(error) / benchmarkTotals.caloriesTotal) * 100);

      activityStats.calories = {
        lunaTotal: Math.round(lunaTotals.caloriesTotal),
        benchmarkTotal: Math.round(benchmarkTotals.caloriesTotal),
        error: Math.round(error),
        accuracyPercent: Math.round(accuracyPercent * 100) / 100,
        mape: Math.round(mape * 100) / 100,
      };
    }

    // Active calories stats
    if (benchmarkTotals.caloriesActive > 0) {
      const accuracyPercent = Math.max(
        0,
        (1 - Math.abs(lunaTotals.caloriesActive - benchmarkTotals.caloriesActive) / benchmarkTotals.caloriesActive) * 100
      );

      activityStats.activeCalories = {
        lunaActive: Math.round(lunaTotals.caloriesActive),
        benchmarkActive: Math.round(benchmarkTotals.caloriesActive),
        accuracyPercent: Math.round(accuracyPercent * 100) / 100,
      };
    }

    // Basal calories stats
    if (benchmarkTotals.caloriesBasal > 0) {
      const accuracyPercent = Math.max(
        0,
        (1 - Math.abs(lunaTotals.caloriesBasal - benchmarkTotals.caloriesBasal) / benchmarkTotals.caloriesBasal) * 100
      );

      activityStats.basalCalories = {
        lunaBasal: Math.round(lunaTotals.caloriesBasal),
        benchmarkBasal: Math.round(benchmarkTotals.caloriesBasal),
        accuracyPercent: Math.round(accuracyPercent * 100) / 100,
      };
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
