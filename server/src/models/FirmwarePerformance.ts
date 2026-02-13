import { Schema, model, Document } from "mongoose";

export interface IFirmwarePerformance extends Document {
  firmwareVersion: string;
  totalSessions: number;
  totalUsers: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
  };
  activityWise: {
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
  }[];
  previousFirmware?: string;
  improvementFromPrevious?: {
    maeDelta?: number;
    rmseDelta?: number;
    accuracyDeltaPercent?: number;
  };
  computedAt: Date;
}

const FirmwarePerformanceSchema = new Schema<IFirmwarePerformance>({
  firmwareVersion: { type: String, unique: true, index: true },
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
  previousFirmware: String,
  improvementFromPrevious: {
    maeDelta: Number,
    rmseDelta: Number,
    accuracyDeltaPercent: Number,
  },
  computedAt: { type: Date, default: Date.now },
});

export default model<IFirmwarePerformance>(
  "FirmwarePerformance",
  FirmwarePerformanceSchema
);
