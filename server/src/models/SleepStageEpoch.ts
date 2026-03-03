import { Schema, model, Document, Types } from "mongoose";

export type SleepStage = "AWAKE" | "LIGHT" | "DEEP" | "REM";

export interface ISleepStageEpoch extends Document {
  meta: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    deviceType: string; // luna | benchmark device (apple, garmin, polar, etc.)
    firmwareVersion?: string;
  };

  timestamp: Date;      // epoch start
  durationSec: number;  // 30 or 60
  stage: SleepStage;

  createdAt: Date;
  updatedAt: Date;
}

const SleepStageEpochSchema = new Schema<ISleepStageEpoch>(
  {
    meta: {
      sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true, index: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
      deviceType: { type: String, required: true, index: true }, // luna | benchmark device
      firmwareVersion: String,
    },
    timestamp: { type: Date, required: true, index: true },
    durationSec: { type: Number, required: true },
    stage: {
      type: String,
      enum: ["AWAKE", "LIGHT", "DEEP", "REM"],
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
SleepStageEpochSchema.index({ "meta.sessionId": 1, timestamp: 1 });
SleepStageEpochSchema.index({ "meta.deviceType": 1 });
SleepStageEpochSchema.index({ "meta.firmwareVersion": 1 });

export default model<ISleepStageEpoch>("SleepStageEpoch", SleepStageEpochSchema);
