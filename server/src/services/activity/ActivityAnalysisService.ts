import { Types } from "mongoose";
import Session from "../../models/Session";
import ActivityDailyReading from "../../models/ActivityDailyReading";
import SessionAnalysis from "../../models/SessionAnalysis";

/**
 * Hourly metric container
 */
interface IHourlyTotals {
  steps: number[];
  distanceMeters: number[];
  caloriesTotal: number[];
  caloriesActive: number[];
  caloriesBasal: number[];
}

/**
 * Aggregated totals across session
 */
interface IAggregatedTotals {
  steps: number;
  distanceMeters: number;

  caloriesTotal: number | null;
  caloriesActive: number | null;
  caloriesBasal: number | null;

  hourly: IHourlyTotals;
}

/**
 * ActivityAnalysisService
 * Computes session-level activity analysis metrics
 */
export class ActivityAnalysisService {
  /**
   * Analyze an activity session
   */
  static async analyzeSession(
    sessionId: Types.ObjectId | string
  ): Promise<void> {
    try {
      console.log(
        `[ActivityAnalysisService] Analyzing session: ${sessionId}`
      );

      const session = await Session.findById(sessionId);

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      if (session.metric !== "Activity") {
        throw new Error(
          `Session ${sessionId} is not an activity session`
        );
      }

      const sessionObjId =
        typeof sessionId === "string"
          ? new Types.ObjectId(sessionId)
          : sessionId;

      /**
       * ============================================
       * FETCH LUNA READINGS
       * ============================================
       */

      const lunaReadings = await ActivityDailyReading.find({
        "meta.sessionId": sessionObjId,
        "meta.deviceType": "luna",
      }).sort({ "meta.date": 1 });

      console.log(
        `[ActivityAnalysisService] 📊 Found ${lunaReadings.length} Luna daily readings`
      );

      /**
       * ============================================
       * EARLY RETURN IF NO LUNA DATA
       * ============================================
       */

      if (lunaReadings.length === 0) {
        console.warn(
          `[ActivityAnalysisService] ⚠️ No Luna data found`
        );

        await SessionAnalysis.findOneAndUpdate(
          { sessionId: sessionObjId },
          {
            sessionId: sessionObjId,
            userId: session.userId,
            activityType: session.activityType,
            metric: session.metric,
            startTime: session.startTime,
            endTime: session.endTime,

            activityStats: {
              steps: {
                lunaTotal: 0,
              },

              distance: {
                lunaMeters: 0,
              },
            },

            isValid: session.isValid,
            computedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        return;
      }

      /**
       * ============================================
       * FETCH BENCHMARK READINGS
       * ============================================
       */

      const benchmarkDeviceType =
        session.benchmarkDeviceType;

      let benchmarkReadings: any[] = [];

      if (benchmarkDeviceType) {
        benchmarkReadings =
          await ActivityDailyReading.find({
            "meta.sessionId": sessionObjId,
            "meta.deviceType": benchmarkDeviceType,
          }).sort({ "meta.date": 1 });

        console.log(
          `[ActivityAnalysisService] 📊 Found ${benchmarkReadings.length} ${benchmarkDeviceType} readings`
        );
      }

      /**
       * ============================================
       * CALCULATE TOTALS
       * ============================================
       */

      const lunaTotals =
        this.calculateTotals(lunaReadings);

      let benchmarkTotals: IAggregatedTotals | null =
        null;

      if (benchmarkReadings.length > 0) {
        benchmarkTotals =
          this.calculateTotals(benchmarkReadings);
      }

      /**
       * ============================================
       * BUILD ACTIVITY STATS
       * ============================================
       */

      let activityStats: any = {};

      /**
       * ============================================
       * LUNA ONLY
       * ============================================
       */

      activityStats.steps = {
        lunaTotal: lunaTotals.steps,

        hourly: {
          luna: lunaTotals.hourly.steps,
        },
      };

      activityStats.distance = {
        lunaMeters: Math.round(
          lunaTotals.distanceMeters
        ),

        hourly: {
          luna: lunaTotals.hourly.distanceMeters,
        },
      };

      activityStats.calories = {
        lunaTotal:
          lunaTotals.caloriesTotal !== null
            ? Math.round(lunaTotals.caloriesTotal)
            : null,

        hourly: {
          luna: lunaTotals.hourly.caloriesTotal,
        },
      };

      activityStats.activeCalories = {
        lunaActive:
          lunaTotals.caloriesActive !== null
            ? Math.round(lunaTotals.caloriesActive)
            : null,

        hourly: {
          luna: lunaTotals.hourly.caloriesActive,
        },
      };

      activityStats.basalCalories = {
        lunaBasal:
          lunaTotals.caloriesBasal !== null
            ? Math.round(lunaTotals.caloriesBasal)
            : null,

        hourly: {
          luna: lunaTotals.hourly.caloriesBasal,
        },
      };

      /**
       * ============================================
       * BENCHMARK COMPARISON
       * ============================================
       */

      if (benchmarkTotals) {
        activityStats =
          this.calculateActivityStats(
            lunaTotals,
            benchmarkTotals
          );
      }

      /**
       * ============================================
       * SAVE SESSION ANALYSIS
       * ============================================
       */

      await SessionAnalysis.findOneAndUpdate(
        { sessionId: sessionObjId },
        {
          sessionId: sessionObjId,

          userId: session.userId,

          activityType: session.activityType,

          metric: session.metric,

          startTime: session.startTime,

          endTime: session.endTime,

          activityStats,

          lunaAccuracyPercent:
            activityStats.steps?.accuracyPercent,

          isValid: session.isValid,

          computedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log(
        `[ActivityAnalysisService] ✅ Analysis completed`
      );
    } catch (error) {
      console.error(
        `[ActivityAnalysisService] ❌ Error analyzing session`,
        error
      );

      throw error;
    }
  }

  /**
   * Aggregate totals from daily readings
   */
  private static calculateTotals(
    readings: any[]
  ): IAggregatedTotals {
    let steps = 0;

    let distanceMeters = 0;

    let caloriesTotal: number | null = null;
    let caloriesActive: number | null = null;
    let caloriesBasal: number | null = null;

    /**
     * ============================================
     * HOURLY AGGREGATORS
     * ============================================
     */

    const hourly: IHourlyTotals = {
      steps: new Array(24).fill(0),

      distanceMeters: new Array(24).fill(0),

      caloriesTotal: new Array(24).fill(0),

      caloriesActive: new Array(24).fill(0),

      caloriesBasal: new Array(24).fill(0),
    };

    /**
     * ============================================
     * TOTALS
     * ============================================
     */

    for (const reading of readings) {
      steps += reading.totals.steps || 0;

      distanceMeters +=
        reading.totals.distanceMeters || 0;

      /**
       * ============================================
       * HOURLY SUMMATION
       * ============================================
       */

      const h = reading.totals.hourly;

      if (h) {
        for (let i = 0; i < 24; i++) {
          hourly.steps[i] += h.steps?.[i] || 0;

          hourly.distanceMeters[i] +=
            h.distanceMeters?.[i] || 0;

          hourly.caloriesTotal[i] +=
            h.caloriesTotal?.[i] || 0;

          hourly.caloriesActive[i] +=
            h.caloriesActive?.[i] || 0;

          hourly.caloriesBasal[i] +=
            h.caloriesBasal?.[i] || 0;
        }
      }
    }

    /**
     * ============================================
     * CALORIE AGGREGATION
     * ============================================
     */

    let hasCaloriesTotal = false;
    let hasCaloriesActive = false;
    let hasCaloriesBasal = false;

    let totalSum = 0;
    let activeSum = 0;
    let basalSum = 0;

    for (const reading of readings) {
      if (
        reading.totals.caloriesTotal !== null &&
        reading.totals.caloriesTotal !== undefined
      ) {
        hasCaloriesTotal = true;

        totalSum +=
          reading.totals.caloriesTotal;
      }

      if (
        reading.totals.caloriesActive !== null &&
        reading.totals.caloriesActive !== undefined
      ) {
        hasCaloriesActive = true;

        activeSum +=
          reading.totals.caloriesActive;
      }

      if (
        reading.totals.caloriesBasal !== null &&
        reading.totals.caloriesBasal !== undefined
      ) {
        hasCaloriesBasal = true;

        basalSum +=
          reading.totals.caloriesBasal;
      }
    }

    caloriesTotal = hasCaloriesTotal
      ? totalSum
      : null;

    caloriesActive = hasCaloriesActive
      ? activeSum
      : null;

    caloriesBasal = hasCaloriesBasal
      ? basalSum
      : null;

    return {
      steps,

      distanceMeters,

      caloriesTotal,

      caloriesActive,

      caloriesBasal,

      hourly,
    };
  }

  /**
   * Hourly bias calculator
   */
  private static calculateHourlyBias(
    luna: number[],
    benchmark: number[]
  ): number[] {
    const result = new Array(24).fill(0);

    for (let i = 0; i < 24; i++) {
      result[i] =
        (luna?.[i] || 0) -
        (benchmark?.[i] || 0);
    }

    return result;
  }

  /**
   * Build comparison stats
   */
  private static calculateActivityStats(
    lunaTotals: IAggregatedTotals,
    benchmarkTotals: IAggregatedTotals
  ): any {
    const activityStats: any = {};

    /**
     * ============================================
     * STEPS
     * ============================================
     */

    if (benchmarkTotals.steps > 0) {
      const error =
        lunaTotals.steps -
        benchmarkTotals.steps;

      const mae = Math.abs(error);

      const mape =
        Math.abs(error / benchmarkTotals.steps) *
        100;

      const accuracyPercent = Math.max(
        0,
        (1 -
          Math.abs(error) /
            benchmarkTotals.steps) *
          100
      );

      const bias = error;

      const ratio =
        lunaTotals.steps /
        benchmarkTotals.steps;

      const rmse = Math.sqrt(
        Math.pow(error, 2)
      );

      activityStats.steps = {
        lunaTotal: lunaTotals.steps,

        benchmarkTotal:
          benchmarkTotals.steps,

        error,

        accuracyPercent:
          Math.round(accuracyPercent * 100) /
          100,

        mae: Math.round(mae),

        mape:
          Math.round(mape * 100) / 100,

        rmse: Math.round(rmse),

        bias: Math.round(bias),

        ratio:
          Math.round(ratio * 1000) / 1000,

        hourly: {
          luna: lunaTotals.hourly.steps,

          benchmark:
            benchmarkTotals.hourly.steps,

          bias: this.calculateHourlyBias(
            lunaTotals.hourly.steps,
            benchmarkTotals.hourly.steps
          ),
        },
      };
    }

    /**
     * ============================================
     * DISTANCE
     * ============================================
     */

    if (benchmarkTotals.distanceMeters > 0) {
      const errorMeters =
        lunaTotals.distanceMeters -
        benchmarkTotals.distanceMeters;

      const mape =
        Math.abs(
          errorMeters /
            benchmarkTotals.distanceMeters
        ) * 100;

      const accuracyPercent = Math.max(
        0,
        (1 -
          Math.abs(errorMeters) /
            benchmarkTotals.distanceMeters) *
          100
      );

      activityStats.distance = {
        lunaMeters: Math.round(
          lunaTotals.distanceMeters
        ),

        benchmarkMeters: Math.round(
          benchmarkTotals.distanceMeters
        ),

        errorMeters:
          Math.round(errorMeters),

        accuracyPercent:
          Math.round(accuracyPercent * 100) /
          100,

        mape:
          Math.round(mape * 100) / 100,

        bias: Math.round(errorMeters),

        mae: Math.round(
          Math.abs(errorMeters)
        ),

        hourly: {
          luna:
            lunaTotals.hourly.distanceMeters,

          benchmark:
            benchmarkTotals.hourly
              .distanceMeters,

          bias: this.calculateHourlyBias(
            lunaTotals.hourly
              .distanceMeters,
            benchmarkTotals.hourly
              .distanceMeters
          ),
        },
      };
    }

    /**
     * ============================================
     * CALORIES
     * ============================================
     */

    activityStats.calories = {
      lunaTotal:
        lunaTotals.caloriesTotal,

      benchmarkTotal:
        benchmarkTotals.caloriesTotal,

      hourly: {
        luna:
          lunaTotals.hourly.caloriesTotal,

        benchmark:
          benchmarkTotals.hourly
            .caloriesTotal,

        bias: this.calculateHourlyBias(
          lunaTotals.hourly
            .caloriesTotal,
          benchmarkTotals.hourly
            .caloriesTotal
        ),
      },
    };

    /**
     * ============================================
     * ACTIVE CALORIES
     * ============================================
     */

    activityStats.activeCalories = {
      lunaActive:
        lunaTotals.caloriesActive,

      benchmarkActive:
        benchmarkTotals.caloriesActive,

      hourly: {
        luna:
          lunaTotals.hourly
            .caloriesActive,

        benchmark:
          benchmarkTotals.hourly
            .caloriesActive,

        bias: this.calculateHourlyBias(
          lunaTotals.hourly
            .caloriesActive,
          benchmarkTotals.hourly
            .caloriesActive
        ),
      },
    };

    /**
     * ============================================
     * BASAL CALORIES
     * ============================================
     */

    activityStats.basalCalories = {
      lunaBasal:
        lunaTotals.caloriesBasal,

      benchmarkBasal:
        benchmarkTotals.caloriesBasal,

      hourly: {
        luna:
          lunaTotals.hourly
            .caloriesBasal,

        benchmark:
          benchmarkTotals.hourly
            .caloriesBasal,

        bias: this.calculateHourlyBias(
          lunaTotals.hourly
            .caloriesBasal,
          benchmarkTotals.hourly
            .caloriesBasal
        ),
      },
    };

    return activityStats;
  }

  /**
   * Delete analysis
   */
  static async deleteSessionAnalysis(
    sessionId: Types.ObjectId | string
  ): Promise<void> {
    try {
      await SessionAnalysis.deleteOne({
        sessionId,
      });

      console.log(
        `[ActivityAnalysisService] Deleted analysis for ${sessionId}`
      );
    } catch (error) {
      console.error(
        `[ActivityAnalysisService] Delete error`,
        error
      );

      throw error;
    }
  }
}