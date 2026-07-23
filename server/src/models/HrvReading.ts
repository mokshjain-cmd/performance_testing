import { Schema, model, Document, Types } from "mongoose";

/**
 * HrvReading Model
 * Stores per-30-second HRV + HR readings for a night, from either the Falcon
 * device or a benchmark (Elite HRV / RRI export). Timeseries collection,
 * mirrors WorkoutReading's shape/indexing.
 */
export interface IHrvReading extends Document {
  meta: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    deviceType: string; // 'luna' or benchmark device (e.g. 'elitehrv')
    firmwareVersion?: string;
  };
  timestamp: Date;
  hrv?: number;
  hr?: number;
  isValid: boolean;
}

const HrvReadingSchema = new Schema<IHrvReading>(
  {
    meta: {
      sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      deviceType: { type: String, required: true },
      firmwareVersion: String,
    },
    timestamp: { type: Date, required: true },
    hrv: { type: Number, default: null },
    hr: { type: Number, default: null },
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

HrvReadingSchema.index({ "meta.sessionId": 1 });
HrvReadingSchema.index({ "meta.sessionId": 1, timestamp: 1 });
HrvReadingSchema.index({ "meta.sessionId": 1, "meta.deviceType": 1 });

export default model<IHrvReading>("HrvReading", HrvReadingSchema);
