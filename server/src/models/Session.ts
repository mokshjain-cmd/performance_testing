    import { Schema, model, Document, Types } from "mongoose";

    export interface ISessionDeviceSnapshot {
    deviceId: Types.ObjectId;
    deviceType: string;
    firmwareVersion?: string;
    }

    export interface ISession extends Document {
    userId: Types.ObjectId;
    activityType: string;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    devices: ISessionDeviceSnapshot[];
    benchmarkDeviceType?: string;
    isValid: boolean;
    createdAt: Date;
    updatedAt: Date;
    }

    const SessionSchema = new Schema<ISession>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        activityType: { type: String, required: true, index: true },
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
        isValid: { type: Boolean, default: true, index: true },
    },
    { timestamps: true }
    );

    SessionSchema.index({ userId: 1, activityType: 1 });

    export default model<ISession>("Session", SessionSchema);
