import { Schema, model, Document, Types } from "mongoose";

export interface INormalizedReading extends Document {
  userId: Types.ObjectId;
  sessionId: Types.ObjectId;
  deviceId: Types.ObjectId;
  deviceType: string;
  firmwareVersion?: string;
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId, ref: "Device", required: true },
    deviceType: { type: String, required: true, index: true },
    firmwareVersion: String,
    timestamp: { type: Date, required: true, index: true },
    metrics: {
      heartRate: Number,
      spo2: Number,
      stress: Number,
      skinTemp: Number,
    },
    isValid: { type: Boolean, default: true, index: true },
  },
  {
    timeseries: {
      timeField: "timestamp",
      metaField: "sessionId",
      granularity: "seconds",
    },
  }
);

NormalizedReadingSchema.index({ sessionId: 1, deviceType: 1, timestamp: 1 });

export default model<INormalizedReading>(
  "NormalizedReading",
  NormalizedReadingSchema
);
