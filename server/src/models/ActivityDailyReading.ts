import { Schema, model, Document, Types } from "mongoose";

/**
 * ActivityDailyReading
 * Stores daily totals for activity metrics (steps, distance, calories)
 * per device per session
 */
export interface IActivityDailyReading extends Document {
  meta: {
    sessionId: Types.ObjectId;
    userId: Types.ObjectId;
    deviceType: string; // luna | apple | garmin | fitbit, etc.
    firmwareVersion?: string;
    date: Date; // Date of the activity (midnight UTC)
  };

  totals: {
    steps?: number;
    distanceMeters?: number;
    caloriesTotal?: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };

  createdAt: Date;
  updatedAt: Date;
}

const ActivityDailyReadingSchema = new Schema<IActivityDailyReading>(
  {
    meta: {
      sessionId: {
        type: Schema.Types.ObjectId,
        ref: "Session",
        required: true,
        index: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
      deviceType: {
        type: String,
        required: true,
        index: true,
      },
      firmwareVersion: String,
      date: {
        type: Date,
        required: true,
        index: true,
      },
    },
    totals: {
      steps: Number,
      distanceMeters: Number,
      caloriesTotal: Number,
      caloriesActive: Number,
      caloriesBasal: Number,
    },
  },
  { timestamps: true }
);

// Composite indexes for efficient querying
ActivityDailyReadingSchema.index({ "meta.sessionId": 1, "meta.deviceType": 1 });
ActivityDailyReadingSchema.index({ "meta.userId": 1, "meta.date": 1 });
ActivityDailyReadingSchema.index({ "meta.firmwareVersion": 1 });

export default model<IActivityDailyReading>(
  "ActivityDailyReading",
  ActivityDailyReadingSchema
);
