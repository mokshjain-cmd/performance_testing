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
  sleepStats?: {
    sleepScore?:number;
    sleepEfficiency?:number;
    totalSleepLunaSec?: number;
    totalSleepBenchmarkSec?: number;
    totalSleepDiffSec?: number;
    deepLunaSec?: number;
    deepBenchmarkSec?: number;
    deepDiffSec?: number;
    remLunaSec?: number;
    remBenchmarkSec?: number;
    remDiffSec?: number;
    lightLunaSec?: number;
    lightBenchmarkSec?: number;
    lightDiffSec?: number;
    awakeLunaSec?: number;
    awakeBenchmarkSec?: number;
    awakeDiffSec?: number;
    lunaSleepOnsetTime?: Date;
    lunaFinalWakeTime?: Date;
    benchmarkSleepOnsetTime?: Date;
    benchmarkFinalWakeTime?: Date;
    epochAccuracyPercent?: number;
    kappaScore?: number;
    confusionMatrix?: {
      AWAKE: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
      LIGHT: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
      DEEP: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
      REM: { AWAKE: number; LIGHT: number; DEEP: number; REM: number };
    };
  };
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

const SleepStatsSchema = new Schema(
  {
    sleepScore: Number,
    sleepEfficiency: Number,
    totalSleepLunaSec: Number,
    totalSleepBenchmarkSec: Number,
    totalSleepDiffSec: Number,
    deepLunaSec: Number,
    deepBenchmarkSec: Number,
    deepDiffSec: Number,
    remLunaSec: Number,
    remBenchmarkSec: Number,
    remDiffSec: Number,
    lightLunaSec: Number,
    lightBenchmarkSec: Number,
    lightDiffSec: Number,
    awakeLunaSec: Number,
    awakeBenchmarkSec: Number,
    awakeDiffSec: Number,
    lunaSleepOnsetTime: Date,
    lunaFinalWakeTime: Date,
    benchmarkSleepOnsetTime: Date,
    benchmarkFinalWakeTime: Date,
    epochAccuracyPercent: Number,
    kappaScore: Number,
    confusionMatrix: {
      AWAKE: { AWAKE: Number, LIGHT: Number, DEEP: Number, REM: Number },
      LIGHT: { AWAKE: Number, LIGHT: Number, DEEP: Number, REM: Number },
      DEEP: { AWAKE: Number, LIGHT: Number, DEEP: Number, REM: Number },
      REM: { AWAKE: Number, LIGHT: Number, DEEP: Number, REM: Number },
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
  sleepStats: SleepStatsSchema,
  isValid: { type: Boolean, default: true },
  computedAt: { type: Date, default: Date.now },
});

export default model<ISessionAnalysis>(
  "SessionAnalysis",
  SessionAnalysisSchema
);
