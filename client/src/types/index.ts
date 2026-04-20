// ========================
// API RESPONSE
// ========================
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

// ========================
// USER
// ========================
export interface User {
  _id: string;
  name: string;
  email: string;
}

// ========================
// DEVICE
// ========================
export interface Device {
  _id: string;
  deviceId: string;
  deviceType: string;
  firmwareVersion: string;
}

// ========================
// SESSION
// ========================
export interface Session {
  _id: string;
  userId: User;
  activityType: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' | 'Workout';
  startTime: string;
  endTime: string;
  durationSec: number;
  devices: Device[];
  benchmarkDeviceType: string;
  bandPosition: string;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
  rawFiles?: Record<string, string>; // { deviceType: downloadUrl }
}

// ========================
// ANALYSIS
// ========================
export interface DeviceStats {
  deviceType: string;
  firmwareVersion: string;
  hr?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
  spo2?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
  sleep?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
  calories?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
  steps?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
  skinTemp?: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
}

export interface BlandAltmanData {
  differences: number[];
  averages: number[];
  meanDifference: number;
  stdDifference: number;
  upperLimit: number;
  lowerLimit: number;
  percentageInLimits: number;
}

export interface PairwiseComparison {
  d1: string;
  d2: string;
  metric: string;
  mae: number;
  rmse: number;
  pearsonR: number;
  meanBias: number;
  blandAltman?: BlandAltmanData;
}

export interface Analysis {
  _id: string;
  sessionId: string;
  userId: string;
  activityType: string;
  metric?: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' | 'Workout';
  startTime: string;
  endTime: string;
  deviceStats: DeviceStats[];
  pairwiseComparisons: PairwiseComparison[];
  activityStats?: {
    steps?: {
      lunaTotal?: number;
      benchmarkTotal?: number;
      error?: number;
      accuracyPercent?: number;
      bias?: number;
    };
    distance?: {
      lunaMeters?: number;
      benchmarkMeters?: number;
      errorMeters?: number;
      accuracyPercent?: number;
      bias?: number;
    };
    calories?: {
      lunaTotal?: number;
      benchmarkTotal?: number;
      error?: number;
      accuracyPercent?: number;
      bias?: number;
    };
    activeCalories?: {
      lunaActive?: number;
      benchmarkActive?: number;
      accuracyPercent?: number;
      bias?: number;
    };
    basalCalories?: {
      lunaBasal?: number;
      benchmarkBasal?: number;
      accuracyPercent?: number;
      bias?: number;
    };
  };
  workoutStats?: WorkoutStats;
  isValid: boolean;
  computedAt: string;
}

// ========================
// DEVICE POINTS
// ========================
export interface DevicePoint {
  timestamp: string;
  metrics: {
    heartRate?: number | null;
    spo2?: number | null;
    sleep?: number | null;
    calories?: number | null;
    steps?: number | null;
  };
}

export interface SessionFullDetails {
  session: Session;
  analysis: Analysis;
  points: Record<string, DevicePoint[]>;
}

// ========================
// USER SUMMARY
// ========================
export interface UserSummary {
  _id: string;
  userId: User;
  totalSessions: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgMAPE?: number;
  };
  bestSession?: {
    sessionId: string;
    activityType: string;
    accuracyPercent: number;
  };
  activityWiseAccuracy: {
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
    _id: string;
  }[];
  firmwareWiseAccuracy: {
    firmwareVersion: string;
    avgAccuracy: number;
    totalSessions: number;
    _id: string;
  }[];
  bandPositionWiseAccuracy: {
    bandPosition: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
    _id: string;
  }[];
  lastUpdated: string;
}

// ========================
// WORKOUT TYPES
// ========================
export interface WorkoutStats {
  // Identifiers
  sportType: number;
  workoutId: string;
  
  // Duration
  startTime: string;
  endTime: string;
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
    distanceBias?: number;
    distanceAccuracyPercent?: number;
    lunaSteps?: number;
    benchmarkSteps?: number;
    stepsDifference?: number;
    stepsBias?: number;
    stepsAccuracyPercent?: number;
  };
}

// Workout bias stats for admin summaries
export interface WorkoutBiasStats {
  avgHrMae?: number;
  avgHrPearson?: number;
  avgCaloriesBias?: number;
  avgStepsBias?: number;
  avgDistanceBias?: number;
}

export interface WorkoutReading {
  timestamp: string;
  heartRate: number;
  heartRateConfidence?: number;
  exerciseIntensity?: number;
}

export interface WorkoutReadingsResult {
  luna: WorkoutReading[];
  benchmark: WorkoutReading[] | null;
  benchmarkDeviceType?: string;
}

export interface WorkoutSessionDetails {
  session: Session;
  analysis: Analysis & { workoutStats?: WorkoutStats };
  readings: WorkoutReading[];
}

export interface WorkoutOverviewData {
  totalWorkouts: number;
  totalDurationSec: number;
  summary?: {
    overallAccuracy?: {
      avgMAE?: number;
      avgRMSE?: number;
      avgPearson?: number;
      avgMAPE?: number;
    };
    workoutOverview?: {
      avgHrMae?: number;
      avgHrPearson?: number;
      avgCaloriesBias?: number;
      avgStepsBias?: number;
      avgDistanceBias?: number;
    };
  } | null;
  avgHrAccuracy?: {
    mae?: number;
    rmse?: number;
    pearsonR?: number;
    mape?: number;
  };
  sportTypeBreakdown: {
    sportType: number;
    count: number;
    totalDurationSec: number;
  }[];
  recentWorkouts: {
    sessionId: string;
    sportType: number;
    date: string;
    durationSec: number;
    avgHr: number;
  }[];
  workouts?: {
    sessionId: string;
    sportType: number;
    startTime: string;
    endTime: string;
    durationSec: number;
    hr: { avg: number; max: number; min: number };
    calories: number;
    steps: number;
    distance: number;
    lunaAccuracyPercent?: number;
    benchmarkDevice?: string;
  }[];
}

// ========================
// SLEEP TYPES
// ========================
export * from './sleep.types';
