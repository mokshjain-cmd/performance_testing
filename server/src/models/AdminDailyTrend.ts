import { Schema, model, Document } from "mongoose";

export interface IAdminDailyTrend extends Document {
  date: Date; // store date as midnight UTC
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';

  totalSessions: number;
  totalUsers: number;

  lunaStats: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgCoveragePercent?: number;
  };

//   invalidStats: {
//     invalidSessions: number;
//     invalidReadings: number;
//   };

  computedAt: Date;
}

const AdminDailyTrendSchema = new Schema<IAdminDailyTrend>({
  date: { type: Date, required: true, index: true },
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
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

//   invalidStats: {
//     invalidSessions: Number,
//     invalidReadings: Number,
//   },

  computedAt: { type: Date, default: Date.now },
});

AdminDailyTrendSchema.index({ date: 1, metric: 1 }, { unique: true });

export default model<IAdminDailyTrend>("AdminDailyTrend", AdminDailyTrendSchema);
