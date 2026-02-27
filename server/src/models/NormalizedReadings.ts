import { Schema, model, Document, Types } from "mongoose";

export interface INormalizedReading extends Document {
  meta: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    deviceType: string;
    firmwareVersion?: string;
    bandPosition?: string;
    activityType: string;
  };
  timestamp: Date;
  metrics: {
    heartRate?: number | null;
    spo2?: number;
    stress?: number;
    skinTemp?: number;
    sleep?: number;
    calories?: number;
    steps?: number;
  };
  isValid: boolean;
}

const NormalizedReadingSchema = new Schema<INormalizedReading>(
  {
    meta: {
      sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      deviceType: { type: String, required: true },
      firmwareVersion: String,
      bandPosition: String,
      activityType: { type: String, required: true },
    },
    timestamp: { type: Date, required: true },
    metrics: {
      heartRate: { type: Number, default: null },
      spo2: { type: Number, default: null },
      stress: { type: Number, default: null },
      skinTemp: { type: Number, default: null },
      sleep: { type: Number, default: null },
      calories: { type: Number, default: null },
      steps: { type: Number, default: null },
    },
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

// Optional additional indexes
NormalizedReadingSchema.index({ "meta.sessionId": 1 });
NormalizedReadingSchema.index({ "meta.deviceType": 1 });
NormalizedReadingSchema.index({ "meta.firmwareVersion": 1 });
NormalizedReadingSchema.index({ "meta.sessionId": 1, timestamp: 1 });

export default model<INormalizedReading>(
  "NormalizedReading",
  NormalizedReadingSchema
);
