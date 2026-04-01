# Time-Series API Quick Reference

## Schema Structure

### HR Time-Series
```typescript
hr: {
  hasData: boolean;
  avgHR?: number;          // Quick summary
  minHR?: number;
  maxHR?: number;
  timeSeries?: Array<{     // Detailed data (5-min intervals)
    timestamp: Date;
    value: number;
  }>;
}
```

### SpO2 Time-Series
```typescript
spo2: {
  hasData: boolean;
  avgSpO2?: number;        // Quick summary
  minSpO2?: number;
  maxSpO2?: number;
  timeSeries?: Array<{     // Detailed data (15-min intervals)
    timestamp: Date;
    value: number;
  }>;
}
```

### Sleep Hypnograph
```typescript
sleep: {
  hasData: boolean;
  totalSleepMinutes?: number;
  stages?: {               // Duration summaries
    awakeSec: number;
    deepSec: number;
    remSec: number;
    lightSec: number;
  };
  hypnograph?: Array<{     // Minute-by-minute stages
    minute: number;        // 0-600 (minutes since sleep start)
    stage: 'awake' | 'light' | 'deep' | 'rem';
  }>;
}
```

### Hourly Activity
```typescript
activity: {
  hasData: boolean;
  steps?: number;          // Total for the day
  hourlySteps?: Array<{    // Hourly breakdown
    hour: number;          // 0-23
    steps: number;
  }>;
}
```

---

## Query Examples

### 1. Basic Daily Summary (Fast)
```typescript
// Returns only aggregate metrics
const metrics = await DailyEngagementMetrics.findOne(
  { userId, date: new Date('2026-03-30') },
  { 
    'hr.avgHR': 1, 
    'hr.minHR': 1, 
    'hr.maxHR': 1,
    'sleep.totalSleepMinutes': 1,
    'activity.steps': 1
  }
);

// Response size: ~500 bytes
```

### 2. Detailed HR Time-Series
```typescript
// Returns HR aggregate + time-series
const metrics = await DailyEngagementMetrics.findOne(
  { userId, date: new Date('2026-03-30') },
  { 
    'hr': 1, // Gets all HR fields including timeSeries
    'date': 1 
  }
);

// Check if detailed data exists
if (metrics.hr.timeSeries && metrics.hr.timeSeries.length > 0) {
  // Render graph with 288 data points
  const chartData = metrics.hr.timeSeries.map(pt => ({
    x: pt.timestamp,
    y: pt.value
  }));
}

// Response size: ~6 KB
```

### 3. Sleep Hypnograph Visualization
```typescript
// Returns sleep aggregate + hypnograph
const metrics = await DailyEngagementMetrics.findOne(
  { userId, date: new Date('2026-03-30') },
  { 
    'sleep': 1,
    'date': 1 
  }
);

if (metrics.sleep.hypnograph) {
  // Render sleep hypnograph
  const stages = metrics.sleep.hypnograph.map(pt => ({
    minute: pt.minute,
    stage: pt.stage,
    // Convert to actual timestamp
    timestamp: new Date(
      metrics.sleep.startTime.getTime() + pt.minute * 60000
    )
  }));
}

// Response size: ~10 KB
```

### 4. Multi-Metric Detailed Query
```typescript
// Returns all detailed time-series data
const metrics = await DailyEngagementMetrics.findOne(
  { userId, date: new Date('2026-03-30') }
);

// Response includes:
// - hr.timeSeries (288 points)
// - spo2.timeSeries (96 points)
// - sleep.hypnograph (600 points)
// - activity.hourlySteps (24 points)

// Response size: ~18 KB
```

### 5. Week View with Time-Series
```typescript
// Fetch 7 days of detailed data
const weekMetrics = await DailyEngagementMetrics.find({
  userId,
  date: { 
    $gte: new Date('2026-03-24'), 
    $lte: new Date('2026-03-30') 
  }
}).sort({ date: 1 });

// Response size: ~126 KB (7 days × 18 KB)
// Consider pagination if fetching longer periods
```

### 6. Check Data Availability
```typescript
// Find which days have detailed HR data
const daysWithHRData = await DailyEngagementMetrics.find(
  {
    userId,
    date: { $gte: startDate, $lte: endDate },
    'hr.timeSeries': { $exists: true, $ne: [] }
  },
  { date: 1 }
);

// Returns: [{ date: '2026-03-28' }, { date: '2026-03-30' }, ...]
```

---

## REST API Endpoint Design

### Option 1: Separate Endpoints (Recommended)

#### Summary Endpoint (Fast)
```
GET /api/engagement/summary?userId={id}&date={date}

Response: {
  date: "2026-03-30",
  hr: { avgHR: 72, minHR: 55, maxHR: 120, hasData: true },
  sleep: { sleepScore: 85, totalSleepMinutes: 450 },
  activity: { steps: 8542 },
  spo2: { avgSpO2: 97.2 }
}

Size: ~500 bytes
Latency: 20-50ms
```

#### Details Endpoint (Detailed)
```
GET /api/engagement/details?userId={id}&date={date}&metrics=hr,sleep

Query params:
- metrics: Comma-separated list (hr, sleep, spo2, activity)

Response: {
  date: "2026-03-30",
  hr: {
    avgHR: 72,
    timeSeries: [
      { timestamp: "2026-03-30T08:00:00Z", value: 68 },
      { timestamp: "2026-03-30T08:05:00Z", value: 70 },
      // ... more points
    ]
  },
  sleep: {
    totalSleepMinutes: 450,
    hypnograph: [
      { minute: 0, stage: "light" },
      { minute: 1, stage: "light" },
      // ... more points
    ]
  }
}

Size: Varies (6-18 KB depending on metrics requested)
Latency: 50-150ms
```

### Option 2: Single Endpoint with Flag

```
GET /api/engagement/daily?userId={id}&date={date}&detail={true|false}

detail=false:
- Returns only aggregate metrics
- Fast response for dashboard cards

detail=true:
- Returns aggregate + time-series
- For detailed graphs/charts
```

---

## Frontend Data Handling

### React Hook Example
```typescript
// useDailyMetrics.ts
import { useState, useEffect } from 'react';

interface MetricsOptions {
  includeTimeSeries?: boolean;
}

export function useDailyMetrics(
  userId: string, 
  date: string, 
  options: MetricsOptions = {}
) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = options.includeTimeSeries 
      ? `/api/engagement/details?userId=${userId}&date=${date}`
      : `/api/engagement/summary?userId=${userId}&date=${date}`;

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      });
  }, [userId, date, options.includeTimeSeries]);

  return { metrics, loading };
}

// Usage:
// Quick summary for cards
const { metrics } = useDailyMetrics(userId, date);

// Detailed for graphs
const { metrics } = useDailyMetrics(userId, date, { includeTimeSeries: true });
```

### Conditional Rendering
```typescript
// HRChart.tsx
export function HRChart({ userId, date }) {
  const { metrics } = useDailyMetrics(userId, date, { includeTimeSeries: true });

  if (!metrics?.hr?.hasData) {
    return <NoDataMessage />;
  }

  // Show aggregate if no time-series available
  if (!metrics.hr.timeSeries || metrics.hr.timeSeries.length === 0) {
    return (
      <SimpleMetricCard 
        label="Average HR"
        value={metrics.hr.avgHR}
        min={metrics.hr.minHR}
        max={metrics.hr.maxHR}
      />
    );
  }

  // Show detailed graph if time-series available
  return (
    <LineChart 
      data={metrics.hr.timeSeries.map(pt => ({
        x: new Date(pt.timestamp),
        y: pt.value
      }))}
    />
  );
}
```

---

## Performance Tips

### 1. Use Projections
```typescript
// ❌ BAD: Fetches entire document (18 KB)
const metrics = await DailyEngagementMetrics.findOne({ userId, date });

// ✅ GOOD: Fetches only needed fields (6 KB)
const metrics = await DailyEngagementMetrics.findOne(
  { userId, date },
  { 'hr': 1, 'date': 1 }
);
```

### 2. Paginate Long Date Ranges
```typescript
// ❌ BAD: Fetches 30 days = 540 KB
const monthMetrics = await DailyEngagementMetrics.find({
  userId,
  date: { $gte: startDate, $lte: endDate }
});

// ✅ GOOD: Fetch in batches
async function fetchWeekBatches(userId, startDate, endDate) {
  const weeks = splitIntoWeeks(startDate, endDate);
  const results = [];
  
  for (const week of weeks) {
    const data = await DailyEngagementMetrics.find({
      userId,
      date: { $gte: week.start, $lte: week.end }
    });
    results.push(...data);
  }
  
  return results;
}
```

### 3. Cache Summary Data
```typescript
// Cache aggregate metrics (rarely changes)
const cacheKey = `metrics:${userId}:${date}:summary`;
let summary = await redis.get(cacheKey);

if (!summary) {
  const metrics = await DailyEngagementMetrics.findOne(
    { userId, date },
    { 'hr.avgHR': 1, 'sleep.sleepScore': 1, 'activity.steps': 1 }
  );
  summary = JSON.stringify(metrics);
  await redis.set(cacheKey, summary, 'EX', 3600); // Cache 1 hour
}

// Don't cache time-series (too large for Redis)
```

### 4. Compress Large Responses
```typescript
// In Express middleware
app.use(compression({
  filter: (req, res) => {
    // Compress responses > 1KB
    return req.url.includes('/details');
  },
  threshold: 1024
}));

// 18 KB → ~3 KB with gzip compression
```

---

## Migration Queries

### Check Time-Series Data Availability
```javascript
// MongoDB shell
db.dailyengagementmetrics.aggregate([
  {
    $project: {
      userId: 1,
      date: 1,
      hasHRTimeSeries: { 
        $gt: [{ $size: { $ifNull: ['$hr.timeSeries', []] } }, 0] 
      },
      hasSleepHypnograph: { 
        $gt: [{ $size: { $ifNull: ['$sleep.hypnograph', []] } }, 0] 
      },
      hasSpO2TimeSeries: { 
        $gt: [{ $size: { $ifNull: ['$spo2.timeSeries', []] } }, 0] 
      }
    }
  },
  {
    $group: {
      _id: null,
      totalDocs: { $sum: 1 },
      withHRTimeSeries: { $sum: { $cond: ['$hasHRTimeSeries', 1, 0] } },
      withSleepHypnograph: { $sum: { $cond: ['$hasSleepHypnograph', 1, 0] } },
      withSpO2TimeSeries: { $sum: { $cond: ['$hasSpO2TimeSeries', 1, 0] } }
    }
  }
]);
```

### Document Size Distribution
```javascript
// Check average document sizes
db.dailyengagementmetrics.aggregate([
  {
    $project: {
      docSize: { $bsonSize: '$$ROOT' }
    }
  },
  {
    $bucket: {
      groupBy: '$docSize',
      boundaries: [0, 5000, 10000, 20000, 50000, 100000],
      default: 'over100KB',
      output: {
        count: { $sum: 1 }
      }
    }
  }
]);

// Expected output:
// { _id: 0, count: 0 }          // < 5 KB (old docs without time-series)
// { _id: 5000, count: 0 }       // 5-10 KB
// { _id: 10000, count: 1500 }   // 10-20 KB (new docs with time-series)
// { _id: 20000, count: 0 }      // 20-50 KB
```

---

## Testing Checklist

- [ ] Seed script generates realistic time-series data
- [ ] Documents stay under 30 KB
- [ ] Queries with projections return only requested fields
- [ ] API endpoints handle missing time-series gracefully
- [ ] Frontend renders aggregate view when time-series absent
- [ ] Frontend renders detailed graphs when time-series present
- [ ] Week view queries complete in < 500ms
- [ ] Compression reduces response size by 70%+

---

## Common Pitfalls

### ❌ Fetching Too Much Data
```typescript
// This fetches ALL users' data for 30 days = SLOW
const allMetrics = await DailyEngagementMetrics.find({
  date: { $gte: startDate }
});
```

### ❌ Not Checking Time-Series Existence
```typescript
// This will crash if timeSeries is undefined
const firstHR = metrics.hr.timeSeries[0].value;

// ✅ Always check first
if (metrics.hr.timeSeries && metrics.hr.timeSeries.length > 0) {
  const firstHR = metrics.hr.timeSeries[0].value;
}
```

### ❌ Sending Entire Document to Frontend
```typescript
// This sends 18 KB even if frontend only needs summary
res.json(metrics);

// ✅ Send only what's needed
res.json({
  avgHR: metrics.hr.avgHR,
  sleepScore: metrics.sleep.sleepScore,
  steps: metrics.activity.steps
});
```

---

## Summary

✅ **Summary queries:** Use projections, exclude time-series  
✅ **Detailed queries:** Fetch specific metrics only  
✅ **Frontend:** Check time-series existence before rendering graphs  
✅ **Performance:** Cache summaries, compress responses, paginate long ranges  
✅ **Backward compat:** All time-series fields are optional

**Ready to implement!** Start with summary endpoint, then add detailed endpoint incrementally.
