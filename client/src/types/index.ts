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
}

// ========================
// ANALYSIS
// ========================
export interface DeviceStats {
  deviceType: string;
  firmwareVersion: string;
  hr: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
}

export interface PairwiseComparison {
  d1: string;
  d2: string;
  metric: string;
  mae: number;
  rmse: number;
  pearsonR: number;
  meanBias: number;
}

export interface Analysis {
  _id: string;
  sessionId: string;
  userId: string;
  activityType: string;
  startTime: string;
  endTime: string;
  deviceStats: DeviceStats[];
  pairwiseComparisons: PairwiseComparison[];
  isValid: boolean;
  computedAt: string;
}

// ========================
// DEVICE POINTS
// ========================
export interface DevicePoint {
  timestamp: string;
  metrics: {
    heartRate: number | null;
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
