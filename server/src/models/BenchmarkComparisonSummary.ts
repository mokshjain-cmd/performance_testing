import { Schema, model, Document } from "mongoose";

export interface IBenchmarkComparisonSummary extends Document {
  benchmarkDeviceType: string;

  totalSessions: number;

  hrStats: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgBias?: number;
  };

  lastUpdated: Date;
}

const BenchmarkComparisonSummarySchema =
  new Schema<IBenchmarkComparisonSummary>({
    benchmarkDeviceType: { type: String, required: true, unique: true, index: true },

    totalSessions: Number,

    hrStats: {
      avgMAE: Number,
      avgRMSE: Number,
      avgMAPE: Number,
      avgPearson: Number,
      avgBias: Number,
    },

    lastUpdated: { type: Date, default: Date.now },
  });

export default model<IBenchmarkComparisonSummary>(
  "BenchmarkComparisonSummary",
  BenchmarkComparisonSummarySchema
);
