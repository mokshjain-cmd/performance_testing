// ========================
// ACTIVITY TYPES
// ========================

// ========================
// ACTIVITY STATS INTERFACE
// ========================
export interface ActivityMetricStats {
  accuracyPercent: number;
  bias: number;
  mae: number;
  mape: number;
  rmse?: number;
  ratio?: number;
}

export interface ActivityStats {
  steps: ActivityMetricStats;
  distance: ActivityMetricStats;
  calories: ActivityMetricStats;
}

// ========================
// USER ACTIVITY OVERVIEW
// ========================
export interface UserActivityOverview {
  totalSessions: number;
  
  // Core Activity Metrics (averages across all sessions)
  avgTotalSteps: number;
  avgTotalDistance: number; // in meters
  avgTotalCalories: number;
  
  // Comparison Metrics (If Benchmark Available)
  comparison?: {
    steps: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
  };
}

// ========================
// USER SINGLE SESSION VIEW
// ========================
export interface DailyActivityData {
  date: string;
  steps: number;
  distanceMeters: number;
  caloriesTotal: number;
  caloriesActive?: number;
  caloriesBasal?: number;
}

export interface UserSingleActivitySessionView {
  session: {
    _id: string;
    name?: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  
  // Luna metrics
  luna: {
    totalSteps: number;
    totalDistance: number; // meters
    totalCalories: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };
  
  // Benchmark metrics (if available)
  benchmark?: {
    deviceType: string;
    totalSteps: number;
    totalDistance: number;
    totalCalories: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };
  
  // Comparison (if benchmark available)
  comparison?: ActivityStats;
  
  // Daily data (if requested)
  dailyData?: {
    luna: DailyActivityData[];
    benchmark?: DailyActivityData[];
  };
}

// ========================
// ACTIVITY TREND DATA
// ========================
export interface ActivityTrendData {
  date: string;
  lunaSteps: number;
  benchmarkSteps?: number;
  accuracyPercent?: number;
  lunaDistance: number;
  benchmarkDistance?: number;
  lunaCalories: number;
  benchmarkCalories?: number;
}

// ========================
// ADMIN GLOBAL ACTIVITY SUMMARY
// ========================
export interface AdminGlobalActivitySummary {
  totalUsers: number;
  totalSessions: number;
  latestFirmwareVersion: string;
  activityStats: {
    steps: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
  };
}

// ========================
// FIRMWARE PERFORMANCE
// ========================
export interface FirmwareActivityPerformance {
  firmwareVersion: string;
  totalSessions: number;
  activityStats: {
    steps: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
  };
}

// ========================
// BENCHMARK COMPARISON
// ========================
export interface BenchmarkActivityComparison {
  benchmarkDevice: string;
  totalSessions: number;
  activityStats: {
    steps: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
    };
  };
}

// ========================
// ADMIN SESSION SUMMARY
// ========================
export interface AdminActivitySessionSummary {
  sessionId: string;
  userId: string;
  metric: string;
  devices: any[];
  activityStats: ActivityStats | null;
  createdAt: string;
}

// ========================
// ADMIN USER SUMMARY
// ========================
export interface AdminUserActivitySummary {
  userId: string;
  totalSessions: number;
  activityOverview: {
    totalSessions: number;
    avgStepsAccuracyPercent: number;
    avgDistanceAccuracyPercent: number;
    avgCaloriesAccuracyPercent: number;
    avgStepsBias: number;
    avgDistanceBias: number;
    avgCaloriesBias: number;
  } | null;
}

// ========================
// ACCURACY TREND
// ========================
export interface ActivityAccuracyTrend {
  date: string;
  activityStats: {
    steps: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    distance: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
    calories: {
      avgAccuracyPercent: number;
      avgBias: number;
      avgMae: number;
      avgMape: number;
    };
  };
  sessionCount: number;
}

// ========================
// API PARAMETER TYPES
// ========================
export interface GetUserActivitySessionViewParams {
  sessionId: string;
  includeDailyData?: boolean;
}

export interface GetAdminGlobalActivitySummaryParams {
  latestFirmwareOnly?: boolean;
}

export interface GetAdminActivityUserSummaryParams {
  userId: string;
}

export interface GetAdminActivitySessionSummaryParams {
  sessionId: string;
}
