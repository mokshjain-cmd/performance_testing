export type UserStatus = 'active' | 'declining' | 'inactive';

export interface EngagementUser {
  userId: string;
  name: string;
  email: string;
  status: UserStatus;
  avgEngagementScore: number;
  lastActiveDate: string | null;
  consecutiveInactiveDays: number;
  totalDays: number;
}

export interface HRMetrics {
  hasData: boolean;
  dataPoints: number;
  avgHR?: number;
  minHR?: number;
  maxHR?: number;
  wearTimeMinutes?: number;
  timeSeries?: Array<{
    timestamp: string;
    value: number;
  }>;
}

export interface SleepMetrics {
  hasData: boolean;
  sleepScore?: number;
  startTime?: string;
  endTime?: string;
  totalSleepMinutes?: number;
  stages?: {
    awakeSec: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
  };
  hypnograph?: Array<{
    timestamp: string;
    stage: 'awake' | 'light' | 'deep' | 'rem';
  }>;
}

export interface ActivityMetrics {
  hasData: boolean;
  steps?: number;
  hourlySteps?: Array<{
    hour: number;
    steps: number;
  }>;
  distanceMeters?: number;
  caloriesTotal?: number;
  caloriesActive?: number;
  caloriesBasal?: number;
}

export interface SpO2Metrics {
  hasData: boolean;
  timeSeries?: Array<{
    timestamp: string;
    value: number;
  }>;
  dataPoints: number;
  avgSpO2?: number;
  minSpO2?: number;
  maxSpO2?: number;
}

export interface WorkoutMetrics {
  type: string;
  startTime: string;
  durationMinutes: number;
  caloriesBurned?: number;
}

export interface DailyMetrics {
  _id: string;
  userId: string;
  date: string;
  deviceType: string;
  hr: HRMetrics;
  sleep: SleepMetrics;
  activity: ActivityMetrics;
  spo2: SpO2Metrics;
  workouts: WorkoutMetrics[];
  engagementScore: number;
  metricsCollected: string[];
}

export interface UserOverview extends EngagementUser {
  metrics: DailyMetrics[];
}

export interface EngagementStats {
  totalUsers: number;
  activeUsers: number;
  decliningUsers: number;
  inactiveUsers: number;
  avgEngagementScore: number;
  lastUpdated: string;
}
