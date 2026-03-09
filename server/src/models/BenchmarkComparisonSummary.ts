import { Schema, model, Document } from "mongoose";

export interface IBenchmarkComparisonSummary extends Document {
  benchmarkDeviceType: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';

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
      avgAccuracy?: number;
      avgMAE?: number;
      avgMAPE?: number;
      avgBias?: number;
    };
    distance?: {
      avgAccuracy?: number;
      avgMAPE?: number;
    };
    calories?: {
      avgAccuracy?: number;
      avgMAPE?: number;
    };
  };

  lastUpdated: Date;
}

const BenchmarkComparisonSummarySchema =
  new Schema<IBenchmarkComparisonSummary>({
    benchmarkDeviceType: { type: String, required: true, index: true },
    metric: { 
      type: String, 
      enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
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
        avgAccuracy: Number,
        avgMAE: Number,
        avgMAPE: Number,
        avgBias: Number,
      },
      distance: {
        avgAccuracy: Number,
        avgMAPE: Number,
      },
      calories: {
        avgAccuracy: Number,
        avgMAPE: Number,
      },
    },

    lastUpdated: { type: Date, default: Date.now },
  });

BenchmarkComparisonSummarySchema.index({ benchmarkDeviceType: 1, metric: 1 }, { unique: true });

export default model<IBenchmarkComparisonSummary>(
  "BenchmarkComparisonSummary",
  BenchmarkComparisonSummarySchema
);
