import { Schema, model, Document } from "mongoose";

export interface IAdminGlobalSummary extends Document {
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';
  totalUsers: number;
  totalSessions: number;
  totalReadings: number;

  lunaStats: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgCoveragePercent?: number;
    avgBias?: number;
  };

//   invalidStats: {
//     invalidSessions: number;
//     invalidReadings: number;
//     invalidReadingPercent: number;
//   };



  computedAt: Date;
}

const AdminGlobalSummarySchema = new Schema<IAdminGlobalSummary>({
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
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

//   invalidStats: {
//     invalidSessions: Number,
//     invalidReadings: Number,
//     invalidReadingPercent: Number,
//   },

  computedAt: { type: Date, default: Date.now, index: true },
});

export default model<IAdminGlobalSummary>(
  "AdminGlobalSummary",
  AdminGlobalSummarySchema
);
