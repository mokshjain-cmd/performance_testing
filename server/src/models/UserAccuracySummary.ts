import { Schema, model, Document, Types } from "mongoose";

export interface IUserAccuracySummary extends Document {
  userId: Types.ObjectId;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';
  totalSessions: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgMAPE?: number;
  };
  sleepOverview?: {
    avgTotalSleepSec?: number;
    avgDeepSec?: number;
    avgRemSec?: number;
    avgLightSec?: number;
    avgAwakeSec?: number;
    avgSleepEfficiency?: number;
    avgAgreementPercent?: number;
  };
  activityOverview?: {
    avgDailySteps?: number;
    avgDailyDistance?: number;
    avgDailyCalories?: number;
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
  bestSession?: {
    sessionId: Types.ObjectId;
    activityType: string;
    accuracyPercent: number;
  };
  worstSession?: {
    sessionId: Types.ObjectId;
    activityType: string;
    accuracyPercent: number;
  };
  activityWiseAccuracy: {
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
  }[];
  firmwareWiseAccuracy: {
    firmwareVersion: string;
    avgAccuracy: number;
    totalSessions: number;
  }[];
  bandPositionWiseAccuracy: {
    bandPosition: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
  }[];
  lastUpdated: Date;
}

const UserAccuracySummarySchema = new Schema<IUserAccuracySummary>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
    required: true,
    index: true 
  },
  totalSessions: Number,
  overallAccuracy: {
    avgMAE: Number,
    avgRMSE: Number,
    avgPearson: Number,
    avgMAPE: Number,
  },
  sleepOverview: {
    avgTotalSleepSec: Number,
    avgDeepSec: Number,
    avgRemSec: Number,
    avgLightSec: Number,
    avgAwakeSec: Number,
    avgSleepEfficiency: Number,
    avgAgreementPercent: Number,
  },
  activityOverview: {
    avgDailySteps: Number,
    avgDailyDistance: Number,
    avgDailyCalories: Number,
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
  bestSession: {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
    activityType: String,
    accuracyPercent: Number,
  },
  worstSession: {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
    activityType: String,
    accuracyPercent: Number,
  },
  activityWiseAccuracy: [
    {
      activityType: String,
      avgAccuracy: Number,
      totalSessions: Number,
      totalDurationSec: Number,
    },
  ],
  firmwareWiseAccuracy: [
    {
      firmwareVersion: String,
      avgAccuracy: Number,
      totalSessions: Number,
    },
  ],
  bandPositionWiseAccuracy: [
    {
      bandPosition: String,
      avgAccuracy: Number,
      totalSessions: Number,
      totalDurationSec: Number,
    },
  ],
  lastUpdated: { type: Date, default: Date.now },
});

UserAccuracySummarySchema.index({ userId: 1, metric: 1 }, { unique: true });

export default model<IUserAccuracySummary>(
  "UserAccuracySummary",
  UserAccuracySummarySchema
);
