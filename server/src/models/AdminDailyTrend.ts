import { Schema, model, Document } from "mongoose";

export interface IAdminDailyTrend extends Document {
  date: Date; // store date as midnight UTC
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';

  totalSessions: number;
  totalUsers: number;

  lunaStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgCoveragePercent?: number;
  };

  sleepStats?: {
    avgAccuracyPercent?: number;
    avgKappa?: number;
    avgTotalSleepBiasSec?: number;
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

//   invalidStats: {
//     invalidSessions: number;
//     invalidReadings: number;
//   };

  // Firmware version used for this aggregation (if filtered)
  latestFirmwareVersion?: string;

  computedAt: Date;
}

const AdminDailyTrendSchema = new Schema<IAdminDailyTrend>({
  date: { type: Date, required: true, index: true },
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
    required: true,
    index: true 
  },

  totalSessions: Number,
  totalUsers: Number,

  lunaStats: {
    avgMAE: Number,
    avgRMSE: Number,
    avgPearson: Number,
    avgCoveragePercent: Number,
  },

  sleepStats: {
    avgAccuracyPercent: Number,
    avgKappa: Number,
    avgTotalSleepBiasSec: Number,
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
//   },

  latestFirmwareVersion: String,

  computedAt: { type: Date, default: Date.now },
});

AdminDailyTrendSchema.index({ date: 1, metric: 1 }, { unique: true });

export default model<IAdminDailyTrend>("AdminDailyTrend", AdminDailyTrendSchema);
