/**
 * SkinTemp Types
 * Type definitions for Skin Temperature metric feature
 */

export interface SkinTempStats {
  min: number;
  max: number;
  avg: number;
  mean: number;
  median?: number;
  stdDev?: number;
  range: number;
  count?: number;
  dataPoints?: number;
}

export interface SkinTempDeviceData {
  deviceType: string;
  stats: SkinTempStats;
  readings?: SkinTempReading[];
}

export interface SkinTempReading {
  timestamp: string;
  value: number | null;
}

export interface SkinTempComparison {
  correlation: number;
  mae: number;
  mape: number;
  rmse: number;
}

export interface SkinTempSessionView {
  session: {
    _id: string;
    sessionId: string;
    name?: string;
    startTime: string;
    endTime: string;
    date: string;
  };
  luna: SkinTempStats;
  benchmark?: SkinTempStats & { deviceType?: string };
  comparison?: SkinTempComparison;
  readings?: {
    timestamp: string;
    luna: number | null;
    benchmark?: number | null;
  }[];
}

export interface SkinTempSessionSummary {
  sessionId: string;
  date: string;
  luna: SkinTempStats;
  benchmark?: SkinTempStats;
  comparison?: SkinTempComparison;
}

export interface UserSkinTempOverview {
  totalSessions: number;
  avgMean: number;
  avgMin: number;
  avgMax: number;
  avgRange: number;
  comparison?: {
    avgCorrelation: number;
    avgMAE: number;
    avgMAPE: number;
    avgRMSE: number;
  };
  sessions: SkinTempSessionSummary[];
}

export interface SkinTempTrendData {
  date: string;
  lunaAvg: number;
  lunaMin: number;
  lunaMax: number;
  benchmarkAvg?: number;
  benchmarkMin?: number;
  benchmarkMax?: number;
  sessionCount: number;
}

export interface AdminSkinTempUserSummary {
  userId: string;
  userName?: string;
  totalSessions: number;
  avgMean: number;
  avgRange: number;
  avgCorrelation?: number;
}

export interface AdminSkinTempGlobalSummary {
  totalUsers: number;
  totalSessions: number;
  latestFirmwareVersion?: string;
  skinTempStats: {
    avgMean: number;
    avgMin: number;
    avgMax: number;
    avgRange: number;
    avgCorrelation?: number;
    avgMAE?: number;
    avgMAPE?: number;
    avgRMSE?: number;
  };
  userSummaries?: AdminSkinTempUserSummary[];
}

export interface AdminSkinTempFirmwareComparison {
  firmwareVersion: string;
  totalSessions: number;
  skinTempStats: {
    avgMin: number;
    avgMax: number;
    avgRange: number;
    avgMae?: number;
  };
}

export interface AdminSkinTempBenchmarkComparison {
  benchmarkDevice: string;
  totalSessions: number;
  skinTempStats: {
    avgMin: number;
    avgMax: number;
    avgMae?: number;
    avgRmse?: number;
    avgMape?: number;
  };
}
