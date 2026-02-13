import { Schema, model, Document, Types } from "mongoose";

export interface INormalizedReading extends Document {
  meta: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    deviceType: string;
    firmwareVersion?: string;
  };
  timestamp: Date;
  metrics: {
    heartRate?: number;
    spo2?: number;
    stress?: number;
    skinTemp?: number;
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
    },
    timestamp: { type: Date, required: true },
    metrics: {
      heartRate: Number,
      spo2: Number,
      stress: Number,
      skinTemp: Number,
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

export default model<INormalizedReading>(
  "NormalizedReading",
  NormalizedReadingSchema
);
