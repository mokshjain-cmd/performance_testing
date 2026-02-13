import { Schema, model, Document, Types } from "mongoose";

export type DeviceType = "luna" | "polar" | "apple" | "whoop";

export interface IDevice extends Document {
  userId: Types.ObjectId;
  deviceType: DeviceType;
  hardwareVersion?: string;
  firmwareVersion?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    deviceType: {
      type: String,
      enum: ["luna", "polar", "apple", "whoop"],
      required: true,
      index: true,
    },
    hardwareVersion: String,
    firmwareVersion: String,
  },
  { timestamps: true }
);

export default model<IDevice>("Device", DeviceSchema);
