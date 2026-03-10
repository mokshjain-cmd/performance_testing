import { Schema, model, Document } from "mongoose";

export interface IFirmwareConfig extends Document {
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity';
  latestFirmwareVersion: string;
  description?: string; // Optional description of what changed in this version
  updatedAt: Date;
  updatedBy?: string; // Admin user who updated this
}

const FirmwareConfigSchema = new Schema<IFirmwareConfig>({
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Activity'],
    required: true,
    unique: true,
    index: true 
  },
  latestFirmwareVersion: {
    type: String,
    required: true,
  },
  description: String,
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedBy: String,
});

export default model<IFirmwareConfig>(
  "FirmwareConfig",
  FirmwareConfigSchema
);
