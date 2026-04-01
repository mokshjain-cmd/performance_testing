import { Schema, model, Document } from "mongoose";

// Time-series data point interfaces
export interface ITimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface ISleepHypnographPoint {
  timestamp: Date; // Timestamp for each sleep stage point
  stage: 'awake' | 'light' | 'deep' | 'rem';
}

export interface IHourlyActivity {
  hour: number; // 0-23
  steps: number;
}

export interface IDailyEngagementMetrics extends Document {
  userId: Schema.Types.ObjectId;
  date: Date; // YYYY-MM-DD (start of day)
  deviceType: 'luna' | 'polar' | 'apple';
  
  // Log metadata
  logFileName: string;
  uploadedAt: Date;
  parsedAt: Date;
  
  // HR metrics
  hr: {
    hasData: boolean;
    dataPoints: number;
    avgHR?: number;
    minHR?: number;
    maxHR?: number;
    wearTimeMinutes?: number;
    // Time-series data: HR readings every 5 minutes (up to 288 readings/day)
    timeSeries?: ITimeSeriesPoint[];
  };
  
  // Sleep metrics
  sleep: {
    hasData: boolean;
    sleepScore?: number;
    startTime?: Date;
    endTime?: Date;
    totalSleepMinutes?: number;
    stages?: {
      awakeSec: number;
      deepSec: number;
      remSec: number;
      lightSec: number;
    };
    // Hypnograph: Minute-by-minute sleep stages for visualization (up to 600 readings)
    hypnograph?: ISleepHypnographPoint[];
  };
  
  // Activity metrics
  activity: {
    hasData: boolean;
    steps?: number;
    distanceMeters?: number;
    caloriesTotal?: number;
    caloriesActive?: number;
    caloriesBasal?: number;
    // Hourly breakdown for activity graphs (24 readings/day)
    hourlySteps?: IHourlyActivity[];
  };
  
  // SpO2 metrics
  spo2: {
    hasData: boolean;
    dataPoints: number;
    avgSpO2?: number;
    minSpO2?: number;
    maxSpO2?: number;
    // Time-series data: SpO2 readings every 15 minutes (up to 96 readings/day)
    timeSeries?: ITimeSeriesPoint[];
  };
  
  // Workout metrics
  workouts: Array<{
    type: string;
    startTime: Date;
    durationMinutes: number;
    caloriesBurned?: number;
  }>;
  
  // Engagement scoring
  engagementScore: number; // 0-100
  metricsCollected: string[]; // ['HR', 'Sleep', 'Activity', 'SpO2']
  
  createdAt: Date;
  updatedAt: Date;
}

const DailyEngagementMetricsSchema = new Schema<IDailyEngagementMetrics>(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true 
    },
    date: { 
      type: Date, 
      required: true,
      index: true 
    },
    deviceType: { 
      type: String, 
      enum: ['luna', 'polar', 'apple'], 
      default: 'luna',
      required: true 
    },
    
    // Log metadata
    logFileName: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
    parsedAt: Date,
    
    // Metrics
    hr: {
      hasData: { type: Boolean, default: false },
      dataPoints: { type: Number, default: 0 },
      avgHR: Number,
      minHR: Number,
      maxHR: Number,
      wearTimeMinutes: Number,
      // Time-series: HR readings every 5 minutes (up to 288 readings/day)
      // Stored as array of {timestamp, value} for detailed graphs
      timeSeries: [{
        timestamp: Date,
        value: Number,
        _id: false // Disable _id for sub-documents
      }],
    },
    
    sleep: {
      hasData: { type: Boolean, default: false },
      sleepScore: Number,
      startTime: Date,
      endTime: Date,
      totalSleepMinutes: Number,
      stages: {
        awakeSec: Number,
        deepSec: Number,
        remSec: Number,
        lightSec: Number,
      },
      // Hypnograph: Minute-by-minute sleep stages for visualization
      // Format: {timestamp: Date, stage: 'awake'|'light'|'deep'|'rem'}
      hypnograph: [{
        timestamp: Date,
        stage: { 
          type: String, 
          enum: ['awake', 'light', 'deep', 'rem'] 
        },
        _id: false
      }],
    },
    
    activity: {
      hasData: { type: Boolean, default: false },
      steps: Number,
      distanceMeters: Number,
      caloriesTotal: Number,
      caloriesActive: Number,
      caloriesBasal: Number,
      // Hourly step counts for activity graphs (24 readings/day)
      hourlySteps: [{
        hour: { type: Number, min: 0, max: 23 }, // 0-23
        steps: Number,
        _id: false
      }],
    },
    
    spo2: {
      hasData: { type: Boolean, default: false },
      dataPoints: { type: Number, default: 0 },
      avgSpO2: Number,
      minSpO2: Number,
      maxSpO2: Number,
      // Time-series: SpO2 readings every 15 minutes (up to 96 readings/day)
      timeSeries: [{
        timestamp: Date,
        value: Number,
        _id: false
      }],
    },
    
    workouts: [{
      type: { type: String },
      startTime: Date,
      durationMinutes: Number,
      caloriesBurned: Number,
    }],
    
    engagementScore: { type: Number, default: 0, min: 0, max: 100 },
    metricsCollected: [{ type: String }],
  },
  { 
    timestamps: true 
  }
);

// Compound index for efficient querying by user and date range
DailyEngagementMetricsSchema.index({ userId: 1, date: -1 });

// Unique constraint: one record per user per day
DailyEngagementMetricsSchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for engagement score queries (finding inactive users)
DailyEngagementMetricsSchema.index({ engagementScore: 1 });

// Index for date-based queries (recent activity)
DailyEngagementMetricsSchema.index({ date: -1 });

// Compound index for filtering by device type
DailyEngagementMetricsSchema.index({ userId: 1, deviceType: 1, date: -1 });

export default model<IDailyEngagementMetrics>("DailyEngagementMetrics", DailyEngagementMetricsSchema);
