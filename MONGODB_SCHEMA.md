# MongoDB Schema

## users
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  role: 'tester' | 'admin',
  metadata?: {
    age?: number,
    gender?: string,
    weight?: number,
    height?: number
  },
  createdAt: Date,
  updatedAt: Date
}
```

## otps
```typescript
{
  _id: ObjectId,
  email: string,
  otp: string,
  purpose: 'login' | 'signup',
  createdAt: Date,
  expiresAt: Date,
  verified: boolean
}
```

## devices
```typescript
{
  _id: ObjectId,
  deviceType: 'luna' | 'polar' | 'apple' | 'whoop' | 'amazfit' | 
              'masimo' | 'garmin' | 'coros' | 'fitbit' | 'suunto',
  hardwareVersion?: string,
  firmwareVersion?: string,
  createdAt: Date,
  updatedAt: Date
}
```

## sessions
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  name?: string,
  activityType: string,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  startTime: Date,
  endTime: Date,
  durationSec: number,
  bandPosition?: string,
  devices: [
    {
      deviceId: ObjectId,
      deviceType: string,
      firmwareVersion?: string
    }
  ],
  benchmarkDeviceType?: string,
  rawFiles?: {
    [deviceType: string]: string
  },
  isValid: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

## normalizedreadings
```typescript
{
  _id: ObjectId,
  meta: {
    sessionId: ObjectId,
    userId: ObjectId,
    deviceType: string,
    firmwareVersion?: string,
    bandPosition?: string,
    activityType: string
  },
  timestamp: Date,
  metrics: {
    heartRate?: number | null,
    spo2?: number,
    stress?: number,
    skinTemp?: number,
    sleep?: number,
    calories?: number,
    steps?: number
  },
  isValid: boolean
}
```

## sleepstageepochs
```typescript
{
  _id: ObjectId,
  meta: {
    sessionId: ObjectId,
    userId: ObjectId,
    deviceType: string,
    firmwareVersion?: string
  },
  timestamp: Date,
  durationSec: number,
  stage: 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM',
  createdAt: Date,
  updatedAt: Date
}
```

## sessionanalyses
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,
  userId: ObjectId,
  activityType: string,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  startTime: Date,
  endTime: Date,
  deviceStats: [
    {
      deviceType: string,
      firmwareVersion?: string,
      hr?: {
        min?: number,
        max?: number,
        avg?: number,
        median?: number,
        stdDev?: number,
        range?: number
      },
      spo2?: {
        min?: number,
        max?: number,
        avg?: number,
        median?: number,
        stdDev?: number,
        range?: number
      }
    }
  ],
  pairwiseComparisons: [
    {
      d1: string,
      d2: string,
      metric: string,
      mae?: number,
      rmse?: number,
      mape?: number,
      pearsonR?: number,
      coverage?: number,
      meanBias?: number,
      blandAltman?: {
        differences: number[],
        averages: number[],
        meanDifference: number,
        stdDifference: number,
        upperLimit: number,
        lowerLimit: number,
        percentageInLimits: number
      }
    }
  ],
  lunaAccuracyPercent?: number,
  sleepStats?: {
    sleepScore?: number,
    sleepEfficiency?: number,
    totalSleepLunaSec?: number,
    totalSleepBenchmarkSec?: number,
    totalSleepDiffSec?: number,
    deepLunaSec?: number,
    deepBenchmarkSec?: number,
    deepDiffSec?: number,
    remLunaSec?: number,
    remBenchmarkSec?: number,
    remDiffSec?: number,
    lightLunaSec?: number,
    lightBenchmarkSec?: number,
    lightDiffSec?: number,
    awakeLunaSec?: number,
    awakeBenchmarkSec?: number,
    awakeDiffSec?: number,
    lunaSleepOnsetTime?: Date,
    lunaFinalWakeTime?: Date,
    benchmarkSleepOnsetTime?: Date,
    benchmarkFinalWakeTime?: Date,
    epochAccuracyPercent?: number,
    kappaScore?: number,
    confusionMatrix?: {
      AWAKE: { AWAKE: number, LIGHT: number, DEEP: number, REM: number },
      LIGHT: { AWAKE: number, LIGHT: number, DEEP: number, REM: number },
      DEEP: { AWAKE: number, LIGHT: number, DEEP: number, REM: number },
      REM: { AWAKE: number, LIGHT: number, DEEP: number, REM: number }
    }
  },
  isValid: boolean,
  computedAt: Date
}
```

## useraccuracysummaries
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  totalSessions: number,
  overallAccuracy?: {
    avgMAE?: number,
    avgRMSE?: number,
    avgPearson?: number,
    avgMAPE?: number
  },
  sleepOverview?: {
    avgTotalSleepSec?: number,
    avgDeepSec?: number,
    avgRemSec?: number,
    avgLightSec?: number,
    avgAwakeSec?: number,
    avgSleepEfficiency?: number,
    avgAgreementPercent?: number
  },
  bestSession?: {
    sessionId: ObjectId,
    activityType: string,
    accuracyPercent: number
  },
  worstSession?: {
    sessionId: ObjectId,
    activityType: string,
    accuracyPercent: number
  },
  activityWiseAccuracy: [
    {
      activityType: string,
      avgAccuracy: number,
      totalSessions: number,
      totalDurationSec: number
    }
  ],
  firmwareWiseAccuracy: [
    {
      firmwareVersion: string,
      avgAccuracy: number,
      totalSessions: number
    }
  ],
  bandPositionWiseAccuracy: [
    {
      bandPosition: string,
      avgAccuracy: number,
      totalSessions: number,
      totalDurationSec: number
    }
  ],
  lastUpdated: Date
}
```

## adminglobalsummaries
```typescript
{
  _id: ObjectId,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  totalUsers: number,
  totalSessions: number,
  totalReadings: number,
  lunaStats?: {
    avgMAE?: number,
    avgRMSE?: number,
    avgMAPE?: number,
    avgPearson?: number,
    avgCoveragePercent?: number,
    avgBias?: number
  },
  sleepStats?: {
    avgAccuracyPercent?: number,
    avgKappa?: number,
    avgTotalSleepBiasSec?: number,
    avgDeepBiasSec?: number,
    avgRemBiasSec?: number,
    avgTotalSleepSec?: number,
    avgDeepPercent?: number,
    avgRemPercent?: number
  },
  latestFirmwareVersion?: string,
  computedAt: Date
}
```

## admindailytrends
```typescript
{
  _id: ObjectId,
  date: Date,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  totalSessions: number,
  totalUsers: number,
  lunaStats?: {
    avgMAE?: number,
    avgRMSE?: number,
    avgPearson?: number,
    avgCoveragePercent?: number
  },
  sleepStats?: {
    avgAccuracyPercent?: number,
    avgKappa?: number,
    avgTotalSleepBiasSec?: number
  },
  latestFirmwareVersion?: string,
  computedAt: Date
}
```

## benchmarkcomparisonsummaries
```typescript
{
  _id: ObjectId,
  benchmarkDeviceType: string,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  totalSessions: number,
  hrStats?: {
    avgMAE?: number,
    avgRMSE?: number,
    avgMAPE?: number,
    avgPearson?: number,
    avgBias?: number
  },
  sleepStats?: {
    avgAccuracyPercent?: number,
    avgKappa?: number,
    avgTotalSleepBiasSec?: number,
    avgDeepBiasSec?: number,
    avgRemBiasSec?: number
  },
  lastUpdated: Date
}
```

## activityperformancesummaries
```typescript
{
  _id: ObjectId,
  activityType: string,
  totalSessions: number,
  avgMAE?: number,
  avgRMSE?: number,
  avgPearson?: number,
  avgCoveragePercent?: number,
  lastUpdated: Date
}
```

## firmwareperformances
```typescript
{
  _id: ObjectId,
  firmwareVersion: string,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  totalSessions: number,
  totalUsers: number,
  overallAccuracy?: {
    avgMAE?: number,
    avgRMSE?: number,
    avgMAPE?: number,
    avgPearson?: number
  },
  activityWise?: [
    {
      activityType: string,
      avgAccuracy: number,
      totalSessions: number
    }
  ],
  sleepStats?: {
    avgAccuracyPercent?: number,
    avgKappa?: number,
    avgTotalSleepBiasSec?: number,
    avgDeepBiasSec?: number,
    avgRemBiasSec?: number
  },
  computedAt: Date
}
```

## firmwareconfigs
```typescript
{
  _id: ObjectId,
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  latestFirmwareVersion: string,
  description?: string,
  updatedAt: Date,
  updatedBy?: string
}
```
