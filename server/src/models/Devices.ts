import { Schema, model, Document } from "mongoose";

export type DeviceType = "luna" | "polar" | "apple" | "whoop" | "amazfit";

export interface IDevice extends Document {
  deviceType: DeviceType;
  hardwareVersion?: string;
  firmwareVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    deviceType: {
      type: String,
      enum: ["luna", "polar", "apple", "whoop", "amazfit"],
      required: true,
    },
    hardwareVersion: String,
    firmwareVersion: String,
  },
  { timestamps: true }
);

// Create compound unique index for deviceType + firmwareVersion combination
// This allows multiple devices with same deviceType but different firmwareVersion
DeviceSchema.index({ deviceType: 1, firmwareVersion: 1 }, { unique: true });

export default model<IDevice>("Device", DeviceSchema);
