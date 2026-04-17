import { Schema, model, Document, Types } from "mongoose";

/**
 * WorkoutReading Model
 * Stores per-second HR readings from workout ringPointData
 * Optimized for time-series queries
 */
export interface IWorkoutReading extends Document {
  meta: {
    sessionId: Types.ObjectId;
    workoutId: string; // recordPointDataId from log
    userId: Types.ObjectId;
    deviceType: string; // 'luna' or benchmark device
    firmwareVersion?: string;
  };
  timestamp: Date;
  heartRate: number;
  heartRateConfidence?: number;
  exerciseIntensity?: number;
  isValid: boolean;
}

const WorkoutReadingSchema = new Schema<IWorkoutReading>(
  {
    meta: {
      sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
      workoutId: { type: String, required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      deviceType: { type: String, required: true },
      firmwareVersion: String,
    },
    timestamp: { type: Date, required: true },
    heartRate: { type: Number, required: true },
    heartRateConfidence: { type: Number, default: null },
    exerciseIntensity: { type: Number, default: null },
    isValid: { type: Boolean, default: true },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "meta",
      granularity: "seconds",
    },
  }
);

// Indexes for efficient querying
WorkoutReadingSchema.index({ "meta.sessionId": 1 });
WorkoutReadingSchema.index({ "meta.sessionId": 1, timestamp: 1 });
WorkoutReadingSchema.index({ "meta.sessionId": 1, "meta.deviceType": 1 });
WorkoutReadingSchema.index({ "meta.workoutId": 1 });

export default model<IWorkoutReading>("WorkoutReading", WorkoutReadingSchema);
