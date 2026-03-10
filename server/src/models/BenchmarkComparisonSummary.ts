import { Schema, model, Document } from "mongoose";

export interface IBenchmarkComparisonSummary extends Document {
  benchmarkDeviceType: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';

  totalSessions: number;

  hrStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgBias?: number;
  };

  sleepStats?: {
    avgAccuracyPercent?: number;
    avgKappa?: number;
    avgTotalSleepBiasSec?: number;
    avgDeepBiasSec?: number;
    avgRemBiasSec?: number;
  };

  activityStats?: {
    steps?: {
      avgAccuracyPercent?: number;
      avgDifference?: number;
    };
    distance?: {
      avgAccuracyPercent?: number;
      avgDifference?: number;
    };
    calories?: {
      avgAccuracyPercent?: number;
      avgDifference?: number;
    };
    activeCalories?: {
      avgAccuracyPercent?: number;
      avgDifference?: number;
    };
    basalCalories?: {
      avgAccuracyPercent?: number;
      avgDifference?: number;
    };
  };

  lastUpdated: Date;
}

const BenchmarkComparisonSummarySchema =
  new Schema<IBenchmarkComparisonSummary>({
    benchmarkDeviceType: { type: String, required: true, index: true },
    metric: { 
      type: String, 
      enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
      required: true,
      index: true 
    },

    totalSessions: Number,

    hrStats: {
      avgMAE: Number,
      avgRMSE: Number,
      avgMAPE: Number,
      avgPearson: Number,
      avgBias: Number,
    },

    sleepStats: {
      avgAccuracyPercent: Number,
      avgKappa: Number,
      avgTotalSleepBiasSec: Number,
      avgDeepBiasSec: Number,
      avgRemBiasSec: Number,
    },

    activityStats: {
      steps: {
        avgAccuracyPercent: Number,
        avgDifference: Number,
      },
      distance: {
        avgAccuracyPercent: Number,
        avgDifference: Number,
      },
      calories: {
        avgAccuracyPercent: Number,
        avgDifference: Number,
      },
      activeCalories: {
        avgAccuracyPercent: Number,
        avgDifference: Number,
      },
      basalCalories: {
        avgAccuracyPercent: Number,
        avgDifference: Number,
      },
    },

    lastUpdated: { type: Date, default: Date.now },
  });

BenchmarkComparisonSummarySchema.index({ benchmarkDeviceType: 1, metric: 1 }, { unique: true });

export default model<IBenchmarkComparisonSummary>(
  "BenchmarkComparisonSummary",
  BenchmarkComparisonSummarySchema
);
