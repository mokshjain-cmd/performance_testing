import { Schema, model, Document } from "mongoose";

export interface IFirmwarePerformance extends Document {
  firmwareVersion: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';
  totalSessions: number;
  totalUsers: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
  };
  activityWise?: {
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
  }[];
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
  computedAt: Date;
}

const FirmwarePerformanceSchema = new Schema<IFirmwarePerformance>({
  firmwareVersion: { type: String, index: true },
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
    required: true,
    index: true 
  },
  totalSessions: Number,
  totalUsers: Number,
  overallAccuracy: {
    avgMAE: Number,
    avgRMSE: Number,
    avgMAPE: Number,
    avgPearson: Number,
  },
  activityWise: [
    {
      activityType: String,
      avgAccuracy: Number,
      totalSessions: Number,
    },
  ],
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
  computedAt: { type: Date, default: Date.now },
});

FirmwarePerformanceSchema.index({ firmwareVersion: 1, metric: 1 }, { unique: true });

export default model<IFirmwarePerformance>(
  "FirmwarePerformance",
  FirmwarePerformanceSchema
);
