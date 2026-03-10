import { Schema, model, Document } from "mongoose";

export interface IAdminGlobalSummary extends Document {
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';
  totalUsers: number;
  totalSessions: number;
  totalReadings: number;

  lunaStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgCoveragePercent?: number;
    avgBias?: number;
  };

  sleepStats?: {
    avgAccuracyPercent?: number;
    avgKappa?: number;
    avgTotalSleepBiasSec?: number;
    avgDeepBiasSec?: number;
    avgRemBiasSec?: number;
    avgTotalSleepSec?: number;
    avgDeepPercent?: number;
    avgRemPercent?: number;
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

  // Firmware version used for this aggregation (if filtered)
  latestFirmwareVersion?: string;

  computedAt: Date;
}

const AdminGlobalSummarySchema = new Schema<IAdminGlobalSummary>({
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
    required: true,
    unique: true,
    index: true 
  },
  totalUsers: Number,
  totalSessions: Number,
  totalReadings: Number,

  lunaStats: {
    avgMAE: Number,
    avgRMSE: Number,
    avgMAPE: Number,
    avgPearson: Number,
    avgCoveragePercent: Number,
    avgBias: Number,
  },

  sleepStats: {
    avgAccuracyPercent: Number,
    avgKappa: Number,
    avgTotalSleepBiasSec: Number,
    avgDeepBiasSec: Number,
    avgRemBiasSec: Number,
    avgTotalSleepSec: Number,
    avgDeepPercent: Number,
    avgRemPercent: Number,
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

//   invalidStats: {
//     invalidSessions: Number,
//     invalidReadings: Number,
//     invalidReadingPercent: Number,
//   },

  latestFirmwareVersion: String,

  computedAt: { type: Date, default: Date.now, index: true },
});

export default model<IAdminGlobalSummary>(
  "AdminGlobalSummary",
  AdminGlobalSummarySchema
);
