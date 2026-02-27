import { Schema, model, Document, Types } from "mongoose";

interface IMetricStats {
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  stdDev?: number;
  range?: number;
}

interface IDeviceStats {
  deviceType: string;
  firmwareVersion?: string;
  hr?: IMetricStats;
  spo2?: IMetricStats;
}

interface IBlandAltman {
  differences: number[];
  averages: number[];
  meanDifference: number;
  stdDifference: number;
  upperLimit: number;
  lowerLimit: number;
  percentageInLimits: number;
}

interface IPairwiseComparison {
  d1: string;
  d2: string;
  metric: string;
  mae?: number;
  rmse?: number;
  mape?: number;
  pearsonR?: number;
  coverage?: number;
  meanBias?: number;
  blandAltman?: IBlandAltman;
}

export interface ISessionAnalysis extends Document {
  sessionId: Types.ObjectId;
  userId: Types.ObjectId;
  activityType: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';
  startTime: Date;
  endTime: Date;
  deviceStats: IDeviceStats[];
  pairwiseComparisons: IPairwiseComparison[];
  lunaAccuracyPercent?: number;
  isValid: boolean;
  computedAt: Date;
}

const MetricStatsSchema = new Schema<IMetricStats>(
  {
    min: Number,
    max: Number,
    avg: Number,
    median: Number,
    stdDev: Number,
    range: Number,
  },
  { _id: false }
);

const DeviceStatsSchema = new Schema<IDeviceStats>(
  {
    deviceType: { type: String, required: true },
    firmwareVersion: String,
    hr: MetricStatsSchema,
    spo2: MetricStatsSchema,
  },
  { _id: false }
);

const PairwiseSchema = new Schema<IPairwiseComparison>(
  {
    d1: String,
    d2: String,
    metric: String,
    mae: Number,
    rmse: Number,
    mape: Number,
    pearsonR: Number,
    coverage: Number,
    meanBias: Number,
    blandAltman: {
      differences: [Number],
      averages: [Number],
      meanDifference: Number,
      stdDifference: Number,
      upperLimit: Number,
      lowerLimit: Number,
      percentageInLimits: Number,
    },
  },
  { _id: false }
);

const SessionAnalysisSchema = new Schema<ISessionAnalysis>({
  sessionId: { type: Schema.Types.ObjectId, ref: "Session", index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  activityType: String,
  metric: { 
    type: String, 
    enum: ['HR', 'SPO2', 'Sleep', 'Calories', 'Steps'],
    required: true,
    index: true 
  },
  startTime: Date,
  endTime: Date,
  deviceStats: [DeviceStatsSchema],
  pairwiseComparisons: [PairwiseSchema],
  lunaAccuracyPercent: Number,
  isValid: { type: Boolean, default: true },
  computedAt: { type: Date, default: Date.now },
});

export default model<ISessionAnalysis>(
  "SessionAnalysis",
  SessionAnalysisSchema
);
