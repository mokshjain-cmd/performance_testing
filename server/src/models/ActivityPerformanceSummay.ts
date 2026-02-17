import { Schema, model, Document } from "mongoose";

export interface IActivityPerformanceSummary extends Document {
  activityType: string;

  totalSessions: number;

  avgMAE?: number;
  avgRMSE?: number;
  avgPearson?: number;
  avgCoveragePercent?: number;

  lastUpdated: Date;
}

const ActivityPerformanceSummarySchema = new Schema<IActivityPerformanceSummary>({
  activityType: { type: String, required: true, unique: true, index: true },

  totalSessions: Number,

  avgMAE: Number,
  avgRMSE: Number,
  avgPearson: Number,
  avgCoveragePercent: Number,

  lastUpdated: { type: Date, default: Date.now },
});

export default model<IActivityPerformanceSummary>(
  "ActivityPerformanceSummary",
  ActivityPerformanceSummarySchema
);
