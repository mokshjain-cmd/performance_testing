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
  skinTemp?: IMetricStats;
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
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' | 'Workout';
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
  activityStats?: {
    steps?: {
      lunaTotal?: number;
      benchmarkTotal?: number;
      error?: number;
      accuracyPercent?: number;
      mae?: number;
      mape?: number;
      rmse?: number;
      bias?: number;
      ratio?: number;
    };
    distance?: {
      lunaMeters?: number;
      benchmarkMeters?: number;
      errorMeters?: number;
      accuracyPercent?: number;
      mape?: number;
      bias?: number;
      mae?: number;
    };
    calories?: {
      lunaTotal?: number;
      benchmarkTotal?: number;
      error?: number;
      accuracyPercent?: number;
      mape?: number;
      bias?: number;
      mae?: number;
    };
    activeCalories?: {
      lunaActive?: number;
      benchmarkActive?: number;
      accuracyPercent?: number;
      bias?: number;
      mae?: number;
      mape?: number;
    };
    basalCalories?: {
      lunaBasal?: number;
      benchmarkBasal?: number;
      accuracyPercent?: number;
      bias?: number;
      mae?: number;
      mape?: number;
    };
  };
  workoutStats?: {
    // Identifiers
    sportType: number;
    workoutId: string;
    
    // Duration
    startTime: Date;
    endTime: Date;
    durationSec: number;
    
    // HR Summary (from DevSportInfoBean)
    hr: {
      avg: number;
      max: number;
      min: number;
    };
    
    // HR Zones (seconds in each zone)
    hrZones: {
      warmUp: number;
      fatBurning: number;
      aerobic: number;
      anaerobic: number;
    };
    
    // Activity metrics
    calories: number;
    steps: number;
    distance: number;
    
    // Pace/Speed
    pace: {
      avg: number;
      fast: number;
      slowest: number;
    };
    speed: {
      avg: number;
      fast: number;
    };
    
    // Step cadence
    stepSpeed: {
      avg: number;
      max: number;
    };
    
    // Training metrics
    trainingEffect: number;
    trainingLoad: number;
    vo2max: number;
    recoveryTime: number;
    
    // Computed from ringPointData (Luna)
    computedHr?: {
      avg: number;
      max: number;
      min: number;
      stdDev: number;
      readingCount: number;
    };
    
    // Benchmark comparison (if benchmark provided)
    benchmarkComparison?: {
      benchmarkDevice: string;
      // Luna HR summary
      lunaHrAvg?: number;
      lunaHrMax?: number;
      lunaHrMin?: number;
      // Benchmark HR summary
      benchmarkHrAvg?: number;
      benchmarkHrMax?: number;
      benchmarkHrMin?: number;
      // HR comparison metrics
      hrMae: number;
      hrRmse: number;
      hrMape: number;
      hrPearsonR: number;
      hrMeanBias: number;
      overlapCount: number;
      overlapPercent: number;
      // Workout-level comparisons
      lunaCalories?: number;
      benchmarkCalories?: number;
      caloriesDifference?: number;
      caloriesBias?: number;
      caloriesAccuracyPercent?: number;
      lunaDistance?: number;
      benchmarkDistance?: number;
      distanceDifference?: number;
      distanceAccuracyPercent?: number;
      lunaSteps?: number;
      benchmarkSteps?: number;
      stepsDifference?: number;
      stepsAccuracyPercent?: number;
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
    skinTemp: MetricStatsSchema,
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

const ActivityStatsSchema = new Schema(
  {
    steps: {
      lunaTotal: Number,
      benchmarkTotal: Number,
      error: Number,
      accuracyPercent: Number,
      mae: Number,
      mape: Number,
      rmse: Number,
      bias: Number,
      ratio: Number,
    },
    distance: {
      lunaMeters: Number,
      benchmarkMeters: Number,
      errorMeters: Number,
      accuracyPercent: Number,
      mape: Number,
      bias: Number,
      mae: Number,
    },
    calories: {
      lunaTotal: Number,
      benchmarkTotal: Number,
      error: Number,
      accuracyPercent: Number,
      mape: Number,
      bias: Number,
      mae: Number,
    },
    activeCalories: {
      lunaActive: Number,
      benchmarkActive: Number,
      accuracyPercent: Number,
      bias: Number,
      mae: Number,
      mape: Number,
    },
    basalCalories: {
      lunaBasal: Number,
      benchmarkBasal: Number,
      accuracyPercent: Number,
      bias: Number,
      mae: Number,
      mape: Number,
    },
  },
  { _id: false }
);

const WorkoutStatsSchema = new Schema(
  {
    // Identifiers
    sportType: Number,
    workoutId: String,
    
    // Duration
    startTime: Date,
    endTime: Date,
    durationSec: Number,
    
    // HR Summary
    hr: {
      avg: Number,
      max: Number,
      min: Number,
    },
    
    // HR Zones (seconds in each zone)
    hrZones: {
      warmUp: Number,
      fatBurning: Number,
      aerobic: Number,
      anaerobic: Number,
    },
    
    // Activity metrics
    calories: Number,
    steps: Number,
    distance: Number,
    
    // Pace/Speed
    pace: {
      avg: Number,
      fast: Number,
      slowest: Number,
    },
    speed: {
      avg: Number,
      fast: Number,
    },
    
    // Step cadence
    stepSpeed: {
      avg: Number,
      max: Number,
    },
    
    // Training metrics
    trainingEffect: Number,
    trainingLoad: Number,
    vo2max: Number,
    recoveryTime: Number,
    
    // Computed from ringPointData
    computedHr: {
      avg: Number,
      max: Number,
      min: Number,
      stdDev: Number,
      readingCount: Number,
    },
    
    // Benchmark comparison
    benchmarkComparison: {
      benchmarkDevice: String,
      // Luna HR summary
      lunaHrAvg: Number,
      lunaHrMax: Number,
      lunaHrMin: Number,
      // Benchmark HR summary
      benchmarkHrAvg: Number,
      benchmarkHrMax: Number,
      benchmarkHrMin: Number,
      // HR comparison metrics
      hrMae: Number,
      hrRmse: Number,
      hrMape: Number,
      hrPearsonR: Number,
      hrMeanBias: Number,
      overlapCount: Number,
      overlapPercent: Number,
      // Workout-level comparisons
      lunaCalories: Number,
      benchmarkCalories: Number,
      caloriesDifference: Number,
      caloriesBias: Number,
      caloriesAccuracyPercent: Number,
      lunaDistance: Number,
      benchmarkDistance: Number,
      distanceDifference: Number,
      distanceAccuracyPercent: Number,
      lunaSteps: Number,
      benchmarkSteps: Number,
      stepsDifference: Number,
      stepsAccuracyPercent: Number,
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
    enum: ['HR', 'SPO2', 'Sleep', 'Activity', 'SkinTemp', 'Workout'],
    required: true,
    index: true 
  },
  startTime: Date,
  endTime: Date,
  deviceStats: [DeviceStatsSchema],
  pairwiseComparisons: [PairwiseSchema],
  lunaAccuracyPercent: Number,
  sleepStats: SleepStatsSchema,
  activityStats: ActivityStatsSchema,
  workoutStats: WorkoutStatsSchema,
  isValid: { type: Boolean, default: true },
  computedAt: { type: Date, default: Date.now },
});

export default model<ISessionAnalysis>(
  "SessionAnalysis",
  SessionAnalysisSchema
);
