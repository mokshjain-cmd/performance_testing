    import { Schema, model, Document, Types } from "mongoose";

    export interface ISessionDeviceSnapshot {
    deviceId: Types.ObjectId;
    deviceType: string;
    firmwareVersion?: string;
    }

    export interface ISession extends Document {
    userId: Types.ObjectId;
    name?: string;
    activityType: string;
metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';
startTime: Date;
endTime: Date;
durationSec: number;
bandPosition?: string;
devices: ISessionDeviceSnapshot[];
benchmarkDeviceType?: string;
rawFiles?: Record<string, string>; // { deviceType: downloadUrl }
isValid: boolean;
createdAt: Date;
updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
{
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, index: true },
    activityType: { type: String, required: true, index: true },
    metric: { 
      type: String, 
      enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
      required: true,
      default: 'HR',
      index: true 
    },
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    durationSec: { type: Number, required: true },
    devices: [
    {
        deviceId: { type: Schema.Types.ObjectId, ref: "Device", required: true },
        deviceType: { type: String, required: true },
        firmwareVersion: String,
    },
    ],
    benchmarkDeviceType: String,
    bandPosition: { type: String, default: "wrist" }, //add a default value here i.e wrist
    rawFiles: {
      type: Map,
      of: String,
      default: {}
    },
    isValid: { type: Boolean, default: true, index: true },
},
{ timestamps: true }
);

SessionSchema.index({ userId: 1, activityType: 1 });
SessionSchema.index({ userId: 1, metric: 1 });

export default model<ISession>("Session", SessionSchema);

