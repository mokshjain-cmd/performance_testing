# Engagement Parser

This folder contains parsers specifically designed to extract engagement metrics from Luna Ring application logs.

## Purpose

The engagement parser extracts daily health metrics from Luna app logs that are uploaded by the app team. These logs contain synchronized data from the Luna Ring device including:

- **Heart Rate (HR)** - Continuous heart rate data collected every 5 minutes
- **Blood Oxygen (SpO2)** - Continuous blood oxygen data collected every 15 minutes
- **Activity Data** - Steps, distance, and calories broken down by hour
- **Sleep Data** - Sleep stages, duration, and quality metrics

## Log Format

Luna app logs are text files containing structured log entries in the format:
```
YYYY-MM-DD HH:MM:SS.mmm I/X-LOG: LUNA-> [callback_name] : [JavaBean{...}]
```

## Parsers

### FalconEngagementLunaAppParser

Parses engagement data from Luna Ring Android app logs. Extracts data for a specific date and returns the latest (most accumulated) sync data for that day.

**Key Features:**
- Date-based filtering - only extracts data for the specified date
- Latest data selection - when multiple syncs exist for a date, returns the most recent one
- Comprehensive metrics - extracts HR, SpO2, Activity, and Sleep data
- Wear time calculation - determines device wear duration from HR data points

## Usage

```typescript
import { FalconEngagementLunaAppParser } from './engagementparser/FalconEngagementLunaAppParser';

const parser = new FalconEngagementLunaAppParser();
const logFilePath = '/path/to/app/logs.txt';
const targetDate = new Date('2026-03-18');

const engagementData = await parser.parseLogFile(logFilePath, targetDate);
```

## Data Extraction Points

The parser looks for these specific callback patterns in the logs:

- `LUNA-> onContinuousHeartRateData` - HR data with 5-minute frequency
- `LUNA-> onContinuousBloodOxygenData` - SpO2 data with 15-minute frequency  
- `LUNA-> onDailyData` - Activity metrics (steps, distance, calories)
- `LUNA-> onRingSleepResult` - Sleep session with stage breakdowns

## Notes

- The app may sync multiple times per day, creating duplicate entries
- The parser always returns the **latest** data for a given date (most accumulated metrics)
- Date matching is done on the `date='YYYY-MM-DD HH:MM:SS'` field in each log entry
- Invalid or zero-value data points are handled gracefully
