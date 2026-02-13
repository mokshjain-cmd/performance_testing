import { Schema, model, Document } from "mongoose";

export type DeviceType = "luna" | "polar" | "apple" | "whoop";

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
      enum: ["luna", "polar", "apple", "whoop"],
      required: true,
      unique: true,
      index: true,
    },
    hardwareVersion: String,
    firmwareVersion: String,
  },
  { timestamps: true }
);

export default model<IDevice>("Device", DeviceSchema);
