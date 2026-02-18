import { Schema, model, Document, Types } from "mongoose";

export interface IUserAccuracySummary extends Document {
  userId: Types.ObjectId;
  totalSessions: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgMAPE?: number;
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
  userId: { type: Schema.Types.ObjectId, ref: "User", unique: true, index: true },
  totalSessions: Number,
  overallAccuracy: {
    avgMAE: Number,
    avgRMSE: Number,
    avgPearson: Number,
    avgMAPE: Number,
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

export default model<IUserAccuracySummary>(
  "UserAccuracySummary",
  UserAccuracySummarySchema
);
