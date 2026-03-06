// ========================
// SLEEP TYPES
// ========================

export type SleepStage = 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM';

// ========================
// SLEEP EPOCH
// ========================
export interface SleepEpoch {
  timestamp: string;
  stage: SleepStage;
  durationSec: number;
  deviceType: 'luna' | string;
}

// ========================
// SLEEP SESSION ANALYSIS
// ========================
export interface SleepStats {
  // Duration metrics (in seconds)
  deepLunaSec: number;
  deepBenchmarkSec: number;
  remLunaSec: number;
  remBenchmarkSec: number;
  lightLunaSec: number;
  lightBenchmarkSec: number;
  awakeLunaSec: number;
  awakeBenchmarkSec: number;
  
  // Validation metrics
  totalEpochs: number;
  epochAccuracyPercent: number;
  cohenKappa: number;
  
  // Bias metrics (Luna - Benchmark)
  deepBiasSec: number;
  remBiasSec: number;
  totalSleepBiasSec: number;
  
  // Confusion matrix
  confusionMatrix: {
    actual: SleepStage;
    predicted: SleepStage;
    count: number;
  }[];
  
  // Stage-wise metrics
  stageSensitivity: Record<SleepStage, number>;
  stageSpecificity: Record<SleepStage, number>;
  stagePrecision: Record<SleepStage, number>;
  stageF1Score: Record<SleepStage, number>;
}

export interface SessionAnalysis {
  _id: string;
  sessionId: string;
  userId: string;
  metric: 'Sleep';
  sleepStats: SleepStats;
  createdAt: string;
  updatedAt: string;
}

// ========================
// USER SLEEP OVERVIEW
// ========================
export interface UserSleepOverview {
  totalSessions: number;
  
  // Core sleep metrics (averages)
  avgTotalSleepTimeSec: number;
  avgTimeInBedSec: number;
  avgSleepEfficiency: number;
  avgDeepSleepSec: number;
  avgRemSleepSec: number;
  avgLightSleepSec: number;
  avgAwakeSec: number;
  avgSleepScore?: number;
  
  // Percentages
  avgDeepPercent: number;
  avgRemPercent: number;
  avgLightPercent: number;
  
  // Variability metrics
  sleepDurationStdDev: number;
  sleepConsistencyScore?: number;
  
  // Optional Comparison Metrics (If Benchmark Available)
  comparison?: {
    avgTotalSleepDiffSec: number;
    avgDeepDiffSec: number;
    avgRemDiffSec: number;
    avgAccuracyPercent: number;
  };
}

// ========================
// USER SINGLE SESSION VIEW
// ========================
export interface UserSingleSessionView {
  session: {
    _id: string;
    name?: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  
  luna: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    sleepEfficiencyPercent: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
    awakeSec: number;
    sleepOnsetTime: string;
    finalWakeTime: string;
    sleepScore?: number;
  };
  
  benchmark?: {
    deviceType: string;
    totalSleepTimeSec: number;
    timeInBedSec: number;
    sleepEfficiencyPercent: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
    awakeSec: number;
    sleepOnsetTime?: string;
    finalWakeTime?: string;
    sleepScore?: number;
  };
  
  comparison?: {
    agreementPercent: number;
    kappaScore: number;
    totalSleepDifferenceSec: number;
    deepDifferenceSec: number;
    remDifferenceSec: number;
  };
  
  epochs?: {
    luna: SleepEpoch[];
    benchmark?: SleepEpoch[];
  };
}

// ========================
// ADMIN GLOBAL SUMMARY
// ========================
export interface AdminGlobalSleepSummary {
  // Population metrics
  totalSessions: number;
  totalUsers: number;
  avgTotalSleepTimeSec: number;
  avgDeepPercent: number;
  avgRemPercent: number;
  
  // Validation metrics
  avgEpochAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  avgTotalSleepBiasSec: number;
  
  // Stage sensitivity
  stageSensitivity: Record<SleepStage, number>;
  
  // Latest firmware version
  latestFirmwareVersion: string;
}

// ========================
// ADMIN FIRMWARE COMPARISON
// ========================
export interface FirmwarePerformance {
  firmwareVersion: string;
  avgAccuracy: number;
  avgKappa: number;
  avgTotalSleepBias: number;
  avgDeepBias: number;
  avgRemBias: number;
  totalSessions: number;
}

// ========================
// ADMIN BENCHMARK COMPARISON
// ========================
export interface BenchmarkComparison {
  benchmarkDevice: string;
  avgAccuracy: number;
  avgKappa: number;
  avgDeepBias: number;
  avgRemBias: number;
  sessionCount: number;
}

// ========================
// ADMIN SESSION SUMMARY
// ========================
export interface AdminSessionSummary {
  session: {
    _id: string;
    name?: string;
    userId: string;
    date: string;
    firmwareVersion: string;
    benchmarkDevice: string;
  };
  
  metrics: {
    accuracy: number;
    kappa: number;
    deepBias: number;
    remBias: number;
    totalSleepBias: number;
  };
  
  stageSensitivity: Record<SleepStage, number>;
  stageSpecificity: Record<SleepStage, number>;
  
  confusionMatrix: {
    actual: SleepStage;
    predicted: SleepStage;
    count: number;
    percent: number;
  }[];
  
  epochs: {
    luna: SleepEpoch[];
    benchmark: SleepEpoch[];
  };
  
  disagreeRegions?: {
    startTime: string;
    endTime: string;
    lunaStage: SleepStage;
    benchmarkStage: SleepStage;
  }[];
}

// ========================
// TREND DATA
// ========================
export interface SleepTrendData {
  date: string;
  totalSleepTimeSec: number;
  deepSec: number;
  remSec: number;
  lightSec: number;
  awakeSec: number;
  sleepEfficiencyPercent?: number;
  accuracyPercent?: number;
  kappaScore?: number;
}

// ========================
// API REQUEST/RESPONSE
// ========================
export interface GetUserSleepOverviewParams {
  userId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetUserSessionViewParams {
  sessionId: string;
  includeEpochs?: boolean;
}

export interface GetAdminGlobalSummaryParams {
  firmwareVersion?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetFirmwareComparisonParams {
  startDate?: string;
  endDate?: string;
}

export interface GetBenchmarkComparisonParams {
  firmwareVersion?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAdminUserSummaryParams {
  userId: string;
  startDate?: string;
  endDate?: string;
}

export interface GetAdminSessionSummaryParams {
  sessionId: string;
  includeEpochs?: boolean;
}
