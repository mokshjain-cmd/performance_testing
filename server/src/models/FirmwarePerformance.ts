import { Schema, model, Document } from "mongoose";

export interface IFirmwarePerformance extends Document {
  firmwareVersion: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';
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
  computedAt: Date;
}

const FirmwarePerformanceSchema = new Schema<IFirmwarePerformance>({
  firmwareVersion: { type: String, index: true },
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
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
  computedAt: { type: Date, default: Date.now },
});

FirmwarePerformanceSchema.index({ firmwareVersion: 1, metric: 1 }, { unique: true });

export default model<IFirmwarePerformance>(
  "FirmwarePerformance",
  FirmwarePerformanceSchema
);
