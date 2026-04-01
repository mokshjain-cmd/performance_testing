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

## dailyengagementmetrics
**Enhanced with Time-Series Analytics** (see [server/TIMESERIES_SCHEMA_ENHANCEMENT.md](server/TIMESERIES_SCHEMA_ENHANCEMENT.md))

```typescript
{
  _id: ObjectId,
  userId: ObjectId,               // Ref: User
  date: Date,                     // YYYY-MM-DD (start of day)
  deviceType: 'luna' | 'polar' | 'apple',
  
  // Log metadata
  logFileName: string,
  uploadedAt: Date,
  parsedAt: Date,
  
  // HR metrics
  hr: {
    hasData: boolean,
    dataPoints: number,
    avgHR?: number,               // Quick summary (60-85 bpm)
    minHR?: number,               // Minimum (48-60 bpm)
    maxHR?: number,               // Maximum (100-130 bpm)
    wearTimeMinutes?: number,     // Device wear time
    // NEW: Time-series data for detailed graphs
    timeSeries?: [                // Up to 288 readings/day (5-min intervals)
      {
        timestamp: Date,          // Exact time of reading
        value: number             // HR in bpm
      }
    ]
  },
  
  // Sleep metrics
  sleep: {
    hasData: boolean,
    sleepScore?: number,          // 0-100 sleep quality score
    startTime?: Date,             // Sleep start time
    endTime?: Date,               // Wake up time
    totalSleepMinutes?: number,   // Total sleep duration
    stages?: {                    // Stage duration summaries
      awakeSec: number,           // Awake time in seconds
      deepSec: number,            // Deep sleep in seconds
      remSec: number,             // REM sleep in seconds
      lightSec: number            // Light sleep in seconds
    },
    // NEW: Minute-by-minute sleep stages for hypnograph visualization
    hypnograph?: [                // Up to 600 readings (minute-by-minute)
      {
        minute: number,           // 0-600 (minutes since sleep start)
        stage: 'awake' | 'light' | 'deep' | 'rem'
      }
    ]
  },
  
  // Activity metrics
  activity: {
    hasData: boolean,
    steps?: number,               // Total daily steps
    distanceMeters?: number,      // Total distance traveled
    caloriesTotal?: number,       // Total calories burned
    caloriesActive?: number,      // Active calories
    caloriesBasal?: number,       // Resting metabolic rate
    // NEW: Hourly step distribution for activity graphs
    hourlySteps?: [               // 24 readings (one per hour)
      {
        hour: number,             // 0-23
        steps: number             // Steps in that hour
      }
    ]
  },
  
  // SpO2 metrics
  spo2: {
    hasData: boolean,
    dataPoints: number,
    avgSpO2?: number,             // Average (95-99%)
    minSpO2?: number,             // Minimum (92-95%)
    maxSpO2?: number,             // Maximum (98-100%)
    // NEW: Time-series data for SpO2 trends
    timeSeries?: [                // Up to 96 readings/day (15-min intervals)
      {
        timestamp: Date,          // Exact time of reading
        value: number             // SpO2 percentage
      }
    ]
  },
  
  // Workout events
  workouts: [
    {
      type: string,               // 'running', 'cycling', 'walking', etc.
      startTime: Date,
      durationMinutes: number,
      caloriesBurned?: number
    }
  ],
  
  // Engagement scoring
  engagementScore: number,        // 0-100 (calculated from data completeness)
  metricsCollected: [string],     // ['HR', 'Sleep', 'Activity', 'SpO2']
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
```javascript
{ userId: 1, date: -1 }                     // User timeline queries
{ userId: 1, date: 1 }                      // Unique constraint (one record per user per day)
{ engagementScore: 1 }                      // Find inactive users
{ date: -1 }                                // Recent activity queries
{ userId: 1, deviceType: 1, date: -1 }      // Device-specific filtering
```

**Document Size:** ~18-20 KB per day (includes all time-series data)

**Key Features:**
- **HR Time-Series:** 5-minute interval readings throughout the day (up to 288 data points)
- **SpO2 Time-Series:** 15-minute interval readings, primarily during sleep (up to 96 data points)
- **Sleep Hypnograph:** Minute-by-minute sleep stage tracking for professional visualization (up to 600 data points)
- **Hourly Activity:** Step count distribution across 24 hours for pattern analysis

**Use Cases:**
- Dashboard summary cards (using aggregate metrics: avgHR, sleepScore, steps)
- Detailed HR/SpO2 line graphs (using timeSeries arrays)
- Professional sleep hypnograph visualization (using hypnograph array)
- Activity pattern analysis (using hourlySteps array)

**API Patterns:**
```typescript
// Fast summary query (exclude time-series)
GET /api/engagement/summary?userId={id}&date={date}

// Detailed analytics query (include time-series)
GET /api/engagement/details?userId={id}&date={date}&metrics=hr,sleep
```

**See also:**
- [server/TIMESERIES_SCHEMA_ENHANCEMENT.md](server/TIMESERIES_SCHEMA_ENHANCEMENT.md) - Full architecture guide
- [server/TIMESERIES_API_GUIDE.md](server/TIMESERIES_API_GUIDE.md) - API developer reference
- [server/TIMESERIES_ENHANCEMENT_SUMMARY.md](server/TIMESERIES_ENHANCEMENT_SUMMARY.md) - Quick start guide


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
