# Engagement API - Quick Reference

## Base URL
```
/api/engagement
```

---

## 🚀 NEW Optimized Endpoints (Use These!)

### 1. Get Users List
**Fast list for dropdowns/tables**
```http
GET /api/engagement/users/list
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "userId": "60d5ec49f1b2c8b1f8e4e1a1",
      "name": "John Doe",
      "email": "john@example.com",
      "lastActiveDate": "2026-03-28T00:00:00.000Z",
      "status": "active",
      "avgEngagementScore": 78,
      "totalDataPoints": 45
    }
  ]
}
```

**Use for:** User selection dropdown, user list table

---

### 2. Get User Overview + All Dates
```http
GET /api/engagement/users/:userId/overview
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "stats": {
      "totalDays": 45,
      "avgEngagementScore": 78,
      "firstRecordDate": "2026-01-15T00:00:00.000Z",
      "lastActiveDate": "2026-03-28T00:00:00.000Z"
    },
    "dates": [
      {
        "date": "2026-03-28T00:00:00.000Z",
        "score": 85,
        "metrics": ["HR", "Sleep", "Activity"],
        "deviceType": "luna"
      }
    ]
  }
}
```

**Use for:** User detail page, populating date picker

---

### 3. Get Detailed Metrics for Specific Date
```http
GET /api/engagement/users/:userId/date/:date
```

**Example:**
```
GET /api/engagement/users/60d5ec49f1b2c8b1f8e4e1a1/date/2026-03-28
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "userId": "...",
    "date": "2026-03-28T00:00:00.000Z",
    "deviceType": "luna",
    "hr": {
      "hasData": true,
      "dataPoints": 1440,
      "avgHR": 72,
      "minHR": 45,
      "maxHR": 165,
      "wearTimeMinutes": 1320
    },
    "sleep": {
      "hasData": true,
      "sleepScore": 78,
      "startTime": "2026-03-27T22:30:00.000Z",
      "endTime": "2026-03-28T06:45:00.000Z",
      "totalSleepMinutes": 495,
      "stages": {
        "awakeSec": 1800,
        "deepSec": 7200,
        "remSec": 5400,
        "lightSec": 15300
      }
    },
    "activity": {
      "hasData": true,
      "steps": 8234,
      "distanceMeters": 5847,
      "caloriesTotal": 2100,
      "caloriesActive": 450,
      "caloriesBasal": 1650
    },
    "spo2": {
      "hasData": true,
      "dataPoints": 48,
      "avgSpO2": 97,
      "minSpO2": 94,
      "maxSpO2": 99
    },
    "workouts": [
      {
        "type": "Running",
        "startTime": "2026-03-28T07:00:00.000Z",
        "durationMinutes": 30,
        "caloriesBurned": 250
      }
    ],
    "engagementScore": 85,
    "metricsCollected": ["HR", "Sleep", "Activity", "SpO2", "Workouts"]
  }
}
```

**Use for:** Daily detail view, metric visualization

---

### 4. Get Metrics for Date Range
```http
GET /api/engagement/users/:userId/range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&metricType=hr
```

**Query Parameters:**
- `startDate` (required): ISO date (YYYY-MM-DD)
- `endDate` (required): ISO date (YYYY-MM-DD)
- `metricType` (optional): `hr`, `sleep`, `activity`, `spo2`

**Example:**
```
GET /api/engagement/users/60d5ec49/range?startDate=2026-03-01&endDate=2026-03-28&metricType=hr
```

**Response:**
```json
{
  "success": true,
  "count": 28,
  "data": [
    {
      "date": "2026-03-28T00:00:00.000Z",
      "engagementScore": 85,
      "metricsCollected": ["HR", "Sleep"],
      "deviceType": "luna",
      "hr": {
        "hasData": true,
        "dataPoints": 1440,
        "avgHR": 72,
        "minHR": 45,
        "maxHR": 165,
        "wearTimeMinutes": 1320
      }
    }
  ]
}
```

**Use for:** Charts, trend analysis, data export

---

## 📊 Statistics Endpoints

### Get Overall Stats
```http
GET /api/engagement/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 50,
    "activeUsers": 35,
    "decliningUsers": 8,
    "inactiveUsers": 7,
    "avgEngagementScore": 67,
    "lastUpdated": "2026-03-30T10:00:00.000Z"
  }
}
```

---

### Get Inactive Users
```http
GET /api/engagement/inactive-users?days=14
```

**Query Parameters:**
- `days` (optional): Inactivity threshold (default: 14)

**Response:**
```json
{
  "success": true,
  "count": 7,
  "data": [
    {
      "userId": "...",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "status": "inactive",
      "consecutiveInactiveDays": 21,
      "lastActiveDate": "2026-03-09T00:00:00.000Z"
    }
  ]
}
```

---

## 📤 Upload Endpoint

### Upload Logs
```http
POST /api/engagement/upload-logs
Content-Type: multipart/form-data
```

**Body:**
- Files: Device log files
- `email_{fieldname}`: User email for each file (will lookup user by email)
- `date_{fieldname}`: Date for each file (optional, defaults to current date)

**Example using curl:**
```bash
curl -X POST http://localhost:5050/api/engagement/upload-logs \
  -F "logFile=@/path/to/log.txt" \
  -F "email_logFile=user@example.com" \
  -F "date_logFile=2026-03-20"
```

**Response:**
```json
{
  "success": true,
  "message": "Log upload completed",
  "results": [
    {
      "fileName": "luna_HR_12345.txt",
      "email": "user@example.com",
      "userName": "John Doe",
      "userId": "60d5ec49f1234567890abcde",
      "status": "success"
    }
  ]
}
```

**Error Case (User Not Found):**
```json
{
  "success": true,
  "message": "Log upload completed",
  "results": [
    {
      "fileName": "luna_HR_12345.txt",
      "email": "invalid@example.com",
      "status": "failed",
      "error": "User not found with email: invalid@example.com"
    }
  ]
}
```

---

## 🔄 Legacy Endpoints (Still Supported)

### Get All Users Engagement (Detailed)
```http
GET /api/engagement/users
```
**Note:** Returns full 7-day summary for each user. Use `/users/list` for faster results.

---

### Get User Engagement Summary
```http
GET /api/engagement/users/:userId?days=30
```
**Note:** Use `/users/:userId/overview` for better performance.

---

### Get User Metrics (Filtered)
```http
GET /api/engagement/users/:userId/metrics?startDate=...&endDate=...&metricType=...
```
**Note:** Use `/users/:userId/range` instead - same functionality, better types.

---

## 🎯 Frontend Integration Examples

### TypeScript Interfaces
```typescript
interface UserListItem {
  userId: string;
  name: string;
  email: string;
  lastActiveDate: string | null;
  status: 'active' | 'declining' | 'inactive';
  avgEngagementScore: number;
  totalDataPoints: number;
}

interface UserOverview {
  userId: string;
  name: string;
  email: string;
  stats: {
    totalDays: number;
    avgEngagementScore: number;
    firstRecordDate: string | null;
    lastActiveDate: string | null;
  };
  dates: Array<{
    date: string;
    score: number;
    metrics: string[];
    deviceType: 'luna' | 'polar' | 'apple';
  }>;
}

interface DailyMetrics {
  _id: string;
  userId: string;
  date: string;
  deviceType: 'luna' | 'polar' | 'apple';
  hr: {
    hasData: boolean;
    dataPoints: number;
    avgHR?: number;
    minHR?: number;
    maxHR?: number;
    wearTimeMinutes?: number;
  };
  sleep: {
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
  };
  activity: {
    hasData: boolean;
    steps?: number;
    distanceMeters?: number;
    caloriesTotal?: number;
    caloriesActive?: number;
    caloriesBasal?: number;
  };
  spo2: {
    hasData: boolean;
    dataPoints: number;
    avgSpO2?: number;
    minSpO2?: number;
    maxSpO2?: number;
  };
  workouts: Array<{
    type: string;
    startTime: string;
    durationMinutes: number;
    caloriesBurned?: number;
  }>;
  engagementScore: number;
  metricsCollected: string[];
}
```

### Fetch Examples
```typescript
// 1. Get users list for dropdown
const getUsersList = async () => {
  const response = await fetch('/api/engagement/users/list');
  const data = await response.json();
  return data.data as UserListItem[];
};

// 2. Get user overview for detail page
const getUserOverview = async (userId: string) => {
  const response = await fetch(`/api/engagement/users/${userId}/overview`);
  const data = await response.json();
  return data.data as UserOverview;
};

// 3. Get specific date metrics
const getDateMetrics = async (userId: string, date: string) => {
  const response = await fetch(`/api/engagement/users/${userId}/date/${date}`);
  const data = await response.json();
  return data.data as DailyMetrics;
};

// 4. Get date range for charts
const getDateRangeMetrics = async (
  userId: string,
  startDate: string,
  endDate: string,
  metricType?: 'hr' | 'sleep' | 'activity' | 'spo2'
) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(metricType && { metricType })
  });
  
  const response = await fetch(
    `/api/engagement/users/${userId}/range?${params}`
  );
  const data = await response.json();
  return data.data as DailyMetrics[];
};
```

---

## 🎨 Status Colors

```typescript
const statusColors = {
  active: '#10b981',     // green
  declining: '#f59e0b',  // orange
  inactive: '#ef4444'    // red
};
```

---

## ⚡ Performance Tips

1. **Use `/users/list` instead of `/users`** - 30x faster
2. **Fetch overview once, cache it** - Avoid repeated calls
3. **Use date range with metricType** - Reduces payload size
4. **Implement pagination** - For large date ranges (>90 days)
5. **Cache user list** - Refresh every 5 minutes

---

## 🔒 Authentication

All endpoints require authentication. Include auth token in headers:
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## 🐛 Error Handling

All endpoints return consistent error format:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing params)
- `404` - Resource not found
- `500` - Server error

---

## 📝 Notes

- All dates are in ISO 8601 format
- Timestamps include timezone information
- `hasData: false` means no data was collected for that metric
- `null` values mean data wasn't available/applicable
- Engagement score is 0-100 based on data completeness

---

## 🚀 Coming Soon

- [ ] Pagination support
- [ ] Real-time updates (WebSocket)
- [ ] CSV export endpoint
- [ ] Bulk operations
- [ ] Advanced filtering (device type, metric type)
