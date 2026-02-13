import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionDevice {
  deviceType: string;
  deviceDetails?: mongoose.Types.ObjectId;
  rawFilePath: string;
  rawFileName: string;
}

export interface ISession extends Document {
  sessionName: string;
  activity: string;
  startTime: Date;
  endTime: Date;
  devices: ISessionDevice[];
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SessionDeviceSchema = new Schema({
  deviceType: {
    type: String,
    required: true,
    trim: true
  },
  deviceDetails: {
    type: Schema.Types.ObjectId,
    ref: 'Device'
  },
  rawFilePath: {
    type: String,
    required: true
  },
  rawFileName: {
    type: String,
    required: true
  }
}, { _id: false });

const SessionSchema: Schema = new Schema(
  {
    sessionName: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true
    },
    activity: {
      type: String,
      required: [true, 'Activity is required'],
      trim: true
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required']
    },
    devices: {
      type: [SessionDeviceSchema],
      required: true,
      validate: {
        validator: function(devices: ISessionDevice[]) {
          return devices.length > 0;
        },
        message: 'At least one device is required'
      }
    },
    duration: {
      type: Number // Duration in milliseconds
    }
  },
  {
    timestamps: true
  }
);

// Calculate duration before saving
SessionSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }
  next();
});

export default mongoose.model<ISession>('Session', SessionSchema);
