# Backend API Documentation

Base URL: `http://localhost:3000/api`

## Authentication & Authorization

This API uses role-based access control (RBAC). Users have one of two roles:
- `tester` - Can create sessions and view their own data
- `admin` - Full access including admin endpoints

### Using Role-Based Access Control

To enable role-based access control on protected routes:

1. Include `userId` in your request (body, params, or query)
2. The middleware will verify the user exists and attach the role
3. Restricted endpoints will check if the user has the required role

**Example Protected Request:**
```bash
# Include userId in request body
curl -X GET http://localhost:3000/api/admin/global-summary?userId=65a1b2c3d4e5f6g7h8i9j0k1
```

### Role Requirements by Endpoint

- **Public endpoints**: Health check
- **User endpoints**: Require valid userId (any role)
- **Admin endpoints**: Require `admin` role (marked with 🔒 Admin Only)

---

## Table of Contents

1. [Health Check](#health-check)
2. [Users](#users)
3. [Devices](#devices)
4. [Sessions](#sessions)
5. [Activity Performance](#activity-performance)
6. [Benchmark Comparisons](#benchmark-comparisons)
7. [Firmware Performance](#firmware-performance)
8. [Admin - Daily Trends](#admin---daily-trends)
9. [Admin - Global Summary](#admin---global-summary)

---

## Health Check

### Check API Health

**GET** `/api/health`

Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Users

### Create User

**POST** `/api/users/create`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "tester"
}
```

**Note:** The `role` field is optional and defaults to `"tester"` if not provided. Valid roles: `"tester"`, `"admin"`.

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "tester",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get User by Email

**GET** `/api/users/by-email?email={email}`

Retrieve user information by email address.

**Query Parameters:**
- `email` (required): User's email address

**Example:**
```
GET /api/users/by-email?email=user@example.com
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "tester",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get User Summary

**GET** `/api/users/summary/:userId`

Get overall accuracy summary for a specific user across all their sessions.

**URL Parameters:**
- `userId` (required): User's MongoDB ObjectId

**Example:**
```
GET /api/users/summary/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "totalSessions": 15,
    "overallAccuracy": 94.5,
    "activityWise": [
      {
        "activityType": "running",
        "avgAccuracy": 95.2,
        "totalSessions": 8
      },
      {
        "activityType": "cycling",
        "avgAccuracy": 93.7,
        "totalSessions": 7
      }
    ],
    "bandPositionWise": [
      {
        "bandPosition": "wrist",
        "avgAccuracy": 94.5,
        "totalSessions": 15
      }
    ],
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Devices

### Get All Devices

**GET** `/api/devices`

Retrieve all registered devices.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "deviceType": "luna",
      "firmwareVersion": "v1.2.3",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "deviceType": "polar",
      "firmwareVersion": "v2.0.1",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Device by Type

**GET** `/api/devices/:deviceType`

Get device information by device type.

**URL Parameters:**
- `deviceType` (required): Device type (e.g., "luna", "polar", "coros")

**Example:**
```
GET /api/devices/luna
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "deviceType": "luna",
    "firmwareVersion": "v1.2.3",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Create or Update Device

**POST** `/api/devices`

Create a new device or update existing device firmware version.

**Request Body:**
```json
{
  "deviceType": "luna",
  "firmwareVersion": "v1.2.4"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device created/updated successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "deviceType": "luna",
    "firmwareVersion": "v1.2.4",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

## Sessions

### Create Session

**POST** `/api/sessions/create`

Create a new session by uploading device data files.

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `userId` (required): User's MongoDB ObjectId
- `activityType` (required): Activity type (e.g., "running", "cycling")
- `startTime` (required): Session start time in ISO format (e.g., "2024-01-15T10:00:00")
- `endTime` (required): Session end time in ISO format
- `bandPosition` (optional): Band position (default: "wrist")
- `benchmarkDeviceType` (optional): Benchmark device type
- Device files: Upload files with field names matching device types (e.g., "luna", "polar")

**Example Request (using curl):**
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -F "userId=65a1b2c3d4e5f6g7h8i9j0k1" \
  -F "activityType=running" \
  -F "startTime=2024-01-15T10:00:00" \
  -F "endTime=2024-01-15T10:30:00" \
  -F "bandPosition=wrist" \
  -F "luna=@/path/to/luna-data.csv" \
  -F "polar=@/path/to/polar-data.csv"
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "activityType": "running",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "durationSec": 1800,
    "bandPosition": "wrist",
    "devices": [
      {
        "deviceId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "deviceType": "luna",
        "firmwareVersion": "v1.2.3"
      },
      {
        "deviceId": "65a1b2c3d4e5f6g7h8i9j0k3",
        "deviceType": "polar",
        "firmwareVersion": "v2.0.1"
      }
    ],
    "isValid": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get All Sessions for User

**GET** `/api/sessions/all/:userId`

Get all sessions for a specific user.

**URL Parameters:**
- `userId` (required): User's MongoDB ObjectId

**Example:**
```
GET /api/sessions/all/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "userId": {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "tester"
      },
      "activityType": "running",
      "startTime": "2024-01-15T10:00:00.000Z",
      "endTime": "2024-01-15T10:30:00.000Z",
      "durationSec": 1800,
      "bandPosition": "wrist",
      "devices": [
        {
          "deviceId": "65a1b2c3d4e5f6g7h8i9j0k2",
          "deviceType": "luna",
          "firmwareVersion": "v1.2.3"
        }
      ],
      "isValid": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Sessions by User ID (Query)

**GET** `/api/sessions/by-user?userId={userId}`

Get sessions for a user using query parameter.

**Query Parameters:**
- `userId` (required): User's MongoDB ObjectId

**Example:**
```
GET /api/sessions/by-user?userId=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:** Same as "Get All Sessions for User"

### Get Single Session

**GET** `/api/sessions/:id`

Get details of a specific session.

**URL Parameters:**
- `id` (required): Session's MongoDB ObjectId

**Example:**
```
GET /api/sessions/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "activityType": "running",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "durationSec": 1800,
    "bandPosition": "wrist",
    "devices": [
      {
        "deviceId": "65a1b2c3d4e5f6g7h8i9j0k2",
        "deviceType": "luna",
        "firmwareVersion": "v1.2.3"
      }
    ],
    "isValid": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Full Session Details

**GET** `/api/sessions/full/:id`

Get comprehensive session details including analysis and data points for plotting.

**URL Parameters:**
- `id` (required): Session's MongoDB ObjectId

**Example:**
```
GET /api/sessions/full/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "session": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "activityType": "running",
    "startTime": "2024-01-15T10:00:00.000Z",
    "endTime": "2024-01-15T10:30:00.000Z",
    "durationSec": 1800,
    "devices": [...]
  },
  "analysis": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "sessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "deviceStats": [
      {
        "deviceType": "luna",
        "firmwareVersion": "v1.2.3",
        "totalSamples": 1800,
        "validSamples": 1750,
        "nullSamples": 50,
        "dropRate": 0.0278,
        "availability": 0.9722,
        "hr": {
          "min": 120,
          "max": 165,
          "avg": 142.5,
          "median": 143,
          "stdDev": 8.5,
          "range": 45
        }
      }
    ],
    "pairwiseComparisons": [
      {
        "d1": "luna",
        "d2": "polar",
        "metric": "hr",
        "mae": 2.3,
        "rmse": 3.1,
        "mape": 1.6,
        "pearsonR": 0.985,
        "coverage": 0.97,
        "meanBias": -0.5
      }
    ],
    "lunaAccuracyPercent": 98.4,
    "isValid": true,
    "computedAt": "2024-01-15T10:31:00.000Z"
  },
  "points": [
    {
      "timestamp": "2024-01-15T10:00:00.000Z",
      "luna": 125,
      "polar": 126
    },
    {
      "timestamp": "2024-01-15T10:00:01.000Z",
      "luna": 126,
      "polar": 127
    }
  ]
}
```

### Delete Session

**DELETE** `/api/sessions/:id`

Delete a session and recalculate all affected summaries.

**URL Parameters:**
- `id` (required): Session's MongoDB ObjectId

**Example:**
```
DELETE /api/sessions/65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted successfully",
  "data": {
    "success": true,
    "deletedSessionId": "65a1b2c3d4e5f6g7h8i9j0k1",
    "recalculated": {
      "userId": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firmwareVersion": "v1.2.3",
      "activityType": "running",
      "benchmarkDevices": ["polar"]
    }
  }
}
```

---

## Activity Performance

### Get All Activity Performance Summaries

**GET** `/api/activity-performance`

Get performance summaries for all activity types.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "activityType": "running",
      "totalSessions": 45,
      "avgMAE": 2.1,
      "avgRMSE": 2.8,
      "avgPearson": 0.987,
      "avgCoveragePercent": 97.5,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "activityType": "cycling",
      "totalSessions": 32,
      "avgMAE": 2.5,
      "avgRMSE": 3.2,
      "avgPearson": 0.982,
      "avgCoveragePercent": 96.8,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Specific Activity Performance

**GET** `/api/activity-performance/:activityType`

Get performance summary for a specific activity type.

**URL Parameters:**
- `activityType` (required): Activity type (e.g., "running", "cycling")

**Example:**
```
GET /api/activity-performance/running
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "activityType": "running",
    "totalSessions": 45,
    "avgMAE": 2.1,
    "avgRMSE": 2.8,
    "avgPearson": 0.987,
    "avgCoveragePercent": 97.5,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Benchmark Comparisons

### Get All Benchmark Comparisons

**GET** `/api/benchmark-comparisons`

Get Luna comparison summaries for all benchmark devices.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "benchmarkDeviceType": "polar",
      "totalSessions": 78,
      "hrStats": {
        "avgMAE": 2.2,
        "avgRMSE": 2.9,
        "avgMAPE": 1.5,
        "avgPearson": 0.986,
        "avgBias": -0.3
      },
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "benchmarkDeviceType": "coros",
      "totalSessions": 42,
      "hrStats": {
        "avgMAE": 2.8,
        "avgRMSE": 3.5,
        "avgMAPE": 2.0,
        "avgPearson": 0.978,
        "avgBias": 0.5
      },
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Specific Benchmark Comparison

**GET** `/api/benchmark-comparisons/:deviceType`

Get Luna comparison summary for a specific benchmark device.

**URL Parameters:**
- `deviceType` (required): Benchmark device type (e.g., "polar", "coros")

**Example:**
```
GET /api/benchmark-comparisons/polar
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "benchmarkDeviceType": "polar",
    "totalSessions": 78,
    "hrStats": {
      "avgMAE": 2.2,
      "avgRMSE": 2.9,
      "avgMAPE": 1.5,
      "avgPearson": 0.986,
      "avgBias": -0.3
    },
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Firmware Performance

### Get All Firmware Performance Data

**GET** `/api/firmware-performance`

Get performance data for all Luna firmware versions.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "firmwareVersion": "v1.2.3",
      "totalSessions": 45,
      "totalUsers": 12,
      "overallAccuracy": {
        "avgMAE": 2.1,
        "avgRMSE": 2.8,
        "avgMAPE": 1.5,
        "avgPearson": 0.987
      },
      "activityWise": [
        {
          "activityType": "running",
          "avgAccuracy": 98.5,
          "totalSessions": 25
        },
        {
          "activityType": "cycling",
          "avgAccuracy": 97.8,
          "totalSessions": 20
        }
      ],
      "previousFirmware": "v1.2.2",
      "improvementFromPrevious": {
        "maeDelta": -0.3,
        "rmseDelta": -0.4,
        "accuracyDeltaPercent": 1.2
      },
      "computedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### Get Specific Firmware Performance

**GET** `/api/firmware-performance/:version`

Get performance data for a specific firmware version.

**URL Parameters:**
- `version` (required): Firmware version (e.g., "v1.2.3")

**Example:**
```
GET /api/firmware-performance/v1.2.3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "firmwareVersion": "v1.2.3",
    "totalSessions": 45,
    "totalUsers": 12,
    "overallAccuracy": {
      "avgMAE": 2.1,
      "avgRMSE": 2.8,
      "avgMAPE": 1.5,
      "avgPearson": 0.987
    },
    "activityWise": [
      {
        "activityType": "running",
        "avgAccuracy": 98.5,
        "totalSessions": 25
      }
    ],
    "previousFirmware": "v1.2.2",
    "improvementFromPrevious": {
      "maeDelta": -0.3,
      "rmseDelta": -0.4,
      "accuracyDeltaPercent": 1.2
    },
    "computedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Admin - Daily Trends

🔒 **Admin Only** - These endpoints require `admin` role.

### Get Daily Trends

**GET** `/api/admin/daily-trends?startDate={date}`

Get Luna performance trends by date. Optionally filter from a start date to today.

**Authentication Required:** Admin role

**Query Parameters:**
- `startDate` (optional): Start date in ISO format (YYYY-MM-DD). Returns data from this date to today.
- `userId` (required when auth is enabled): User ID for role verification

**Examples:**
```
GET /api/admin/daily-trends?userId=65a1b2c3d4e5f6g7h8i9j0k1
GET /api/admin/daily-trends?startDate=2024-01-01&userId=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "date": "2024-01-15T00:00:00.000Z",
      "totalSessions": 12,
      "totalUsers": 8,
      "lunaStats": {
        "avgMAE": 2.1,
        "avgRMSE": 2.8,
        "avgPearson": 0.987,
        "avgCoveragePercent": 97.5
      },
      "computedAt": "2024-01-15T23:59:00.000Z"
    },
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "date": "2024-01-16T00:00:00.000Z",
      "totalSessions": 15,
      "totalUsers": 10,
      "lunaStats": {
        "avgMAE": 2.0,
        "avgRMSE": 2.7,
        "avgPearson": 0.989,
        "avgCoveragePercent": 97.8
      },
      "computedAt": "2024-01-16T23:59:00.000Z"
    }
  ]
}
```

### Get Daily Trend for Specific Date

**GET** `/api/admin/daily-trends/:date`

Get Luna performance trend for a specific date.

**Authentication Required:** Admin role

**URL Parameters:**
- `date` (required): Date in ISO format (YYYY-MM-DD)

**Query Parameters:**
- `userId` (required when auth is enabled): User ID for role verification

**Example:**
```
GET /api/admin/daily-trends/2024-01-15?userId=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "date": "2024-01-15T00:00:00.000Z",
    "totalSessions": 12,
    "totalUsers": 8,
    "lunaStats": {
      "avgMAE": 2.1,
      "avgRMSE": 2.8,
      "avgPearson": 0.987,
      "avgCoveragePercent": 97.5
    },
    "computedAt": "2024-01-15T23:59:00.000Z"
  }
}
```

---

## Admin - Global Summary

🔒 **Admin Only** - This endpoint requires `admin` role.

### Get Global Summary

**GET** `/api/admin/global-summary`

Get overall Luna performance summary across all users and sessions.

**Authentication Required:** Admin role

**Query Parameters:**
- `userId` (required when auth is enabled): User ID for role verification

**Example:**
```
GET /api/admin/global-summary?userId=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "totalUsers": 125,
    "totalSessions": 1250,
    "totalReadings": 2250000,
    "lunaStats": {
      "avgMAE": 2.2,
      "avgRMSE": 2.9,
      "avgMAPE": 1.6,
      "avgPearson": 0.985,
      "avgCoveragePercent": 97.3,
      "avgBias": -0.2
    },
    "computedAt": "2024-01-15T23:59:00.000Z"
  }
}
```

---

## Error Responses

All endpoints return standard error responses in the following format:

### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid request parameters",
  "error": "Detailed error message"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- MongoDB ObjectIds are 24-character hexadecimal strings
- Date parameters should be in YYYY-MM-DD format
- File uploads must use `multipart/form-data` content type
- All numeric values (MAE, RMSE, etc.) are rounded to reasonable precision
- Accuracy percentages are calculated as: `100 - MAPE`
- Session data is automatically analyzed upon creation
- Deleting a session triggers recalculation of all affected summaries
