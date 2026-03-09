# Firmware Configuration System

## Overview

The firmware configuration system allows you to specify the "latest" firmware version for each metric type (HR, SPO2, Sleep, Calories, Steps). When configured, **all global overview dashboards** will automatically filter to show only data from sessions using these specified firmware versions.

### How It Works Across Metrics

- **Sleep**: Uses on-demand filtering via `AdminSleepSummaryService.getGlobalSummary(latestFirmwareOnly: true)`
- **HR, SPO2, Calories, Steps**: Uses pre-computed filtering via `updateAdminGlobalSummary(metric, true)` that runs after each session ingestion
- **Result**: All global overviews show only the latest firmware data by default

## Features

1. **Per-Metric Configuration**: Set different firmware versions for different metrics
   - HR metrics
   - SpO2 metrics
   - Sleep metrics
   - Calories metrics
   - Steps metrics

2. **Automatic Filtering**: Global overviews automatically use latest firmware versions
3. **Admin Control**: Only admins can configure firmware versions
4. **Audit Trail**: Tracks who updated each configuration and when

## Usage

### Admin Interface

Navigate to `/admin/firmware-config` to access the firmware configuration page where you can:
- View current firmware configurations for all metrics
- Edit firmware versions
- Add descriptions for each firmware version
- See when each configuration was last updated

### API Endpoints

#### Get All Firmware Configurations
```
GET /api/firmware-config
```
Returns all firmware configurations across all metrics.

#### Get Configuration for Specific Metric
```
GET /api/firmware-config/:metric
```
Example: `GET /api/firmware-config/HR`

#### Update Configuration
```
PUT /api/firmware-config/:metric
Body: {
  "latestFirmwareVersion": "v2.1.5",
  "description": "Improved heart rate accuracy"
}
```

### Backend Services

#### AdminSleepSummaryService
The `getGlobalSummary(latestFirmwareOnly: boolean)` method now supports filtering:
```typescript
// Filter by latest firmware version
const summary = await AdminSleepSummaryService.getGlobalSummary(true);

// Get all firmware versions
const summary = await AdminSleepSummaryService.getGlobalSummary(false);
```

#### updateAdminGlobalSummary Service
Background aggregation service that updates pre-computed summaries for HR, SPO2, and other metrics:
```typescript
// Update with latest firmware filter (default behavior)
await updateAdminGlobalSummary('HR', true);
await updateAdminGlobalSummary('SPO2', true);

// Update with all firmware versions (if needed)
await updateAdminGlobalSummary('HR', false);
```

This service is automatically called after each session ingestion, ensuring the global overview stays up-to-date with latest firmware data.

## Database Schema

### FirmwareConfig Collection
```typescript
{
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps',
  latestFirmwareVersion: string,
  description?: string,
  updatedAt: Date,
  updatedBy?: string
}
```

## Implementation Details

### How Filtering Works

1. **Session Query**: When filtering is enabled, the system:
   - Retrieves the configured latest firmware version for the metric
   - For Sleep Metric**: Frontend requests filtered data on-demand:
   ```typescript
   apiClient.get('/sleep/admin/global-summary', {
     params: { latestFirmwareOnly: true }
   })
   ```

3. **For HR/SPO2/Other Metrics**: Backend pre-computes filtered summaries:
   ```typescript
   // Automatically called after session ingestion
   await updateAdminGlobalSummary('HR', true);
   ```
   Frontend simply fetches the pre-computed summary:
   ```typescript
   apiClient.get('/admin/global-summary?metric=HR'``typescript
   apiClient.get('/sleep/admin/global-summary', {
     params: { latestFirmwareOnly: true }
   })
   ```

3. **Firmware Comparison Tab**: The "Firmware-wise" comparison tab always shows data for ALL firmware versions for comparison purposes.

## Benefits

1. **Data Quality**: Focus on the most recent and relevant firmware data
2. **Performance Tracking**: Monitor improvements across firmware versions
3. **Clean Metrics**: Remove old firmware data from primary views
4. **Flexibility**: Still access all firmware data in comparison views

## Setup Instructions

1. **Configure Firmware Versions**:
   - Log in as admin
   - Navigate to `/admin/firmware-config`
   - Set the latest firmware version for each metric type
Automatic Filtering**: 
   - New sessions are ingested with v2.1.5 firmware
   - Background job runs: `updateAdminGlobalSummary('HR', true)` - filters to v2.1.5 only
   - Pre-computed summaries stored in `AdminGlobalSummary` collection
4. **Global Overviews Updated**: 
   - HR global overview now shows only v2.1.5 sessions
   - SPO2 global overview now shows only v2.1.5 sessions  
   - Sleep global overview now shows only v2.1.5 sessions
5. **Verify Filtering**:
   - Check the global overview dashboard
   - Confirm metrics reflect only the latest firmware data
   - Use the "Firmware-wise" tab to see breakdown by version

## Example Workflow

1. **New Firmware Released**: Luna Band firmware v2.1.5 is deployed
2. **Update Configuration**: Admin sets v2.1.5 as the latest firmware for HR, SPO2, and Sleep
3. **Data Filtering**: Global overviews now show only sessions using v2.1.5
4. **Historical Comparison**: Firmware comparison tab still shows v2.1.4 vs v2.1.5 performance

## Notes

- If no firmware configuration exists for a metric, all sessions are included (backwards compatible)
- Firmware versions are stored as strings, allowing flexible versioning schemes (e.g., "v2.1.5", "2.1.5", "FW_2023_Q4")
- The system tracks Luna device firmware from the `Session.devices` array
