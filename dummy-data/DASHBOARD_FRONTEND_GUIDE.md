# Dashboard API - Frontend Integration Guide

**Last Updated**: 2026-03-26  
**Status**: Complete  
**Target Audience**: Frontend developers implementing the Falcon Testing Dashboard

## Quick Summary

This guide documents four real-time dashboard APIs designed for monitoring anomalies, tickets, and alerts in the Falcon Testing system. These APIs use a compute-on-read strategy (no caching) to provide up-to-the-minute metrics for command center views, historical analysis, trend tracking, and timeline visualization.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Endpoints](#api-endpoints)
   - [Command Center Metrics](#1-command-center-metrics)
   - [Alert History](#2-alert-history)
   - [Anomaly Trend](#3-anomaly-trend)
   - [Ticket Timeline](#4-ticket-timeline)
3. [Dashboard Design Guide](#dashboard-design-guide)
4. [Data Refresh Strategy](#data-refresh-strategy)
5. [Error Handling](#error-handling)
6. [Performance Notes](#performance-notes)

---

## Architecture Overview

**Base URL PROD**: `https://logs-automation-326803110924.asia-south2.run.app`
**Base URL DEV**: `http://localhost:3000`

**Authentication**: Not specified in routes (implement as needed)

**Data Strategy**: Compute-on-read with no caching
- All metrics computed in real-time on each request
- Parallel data fetching for optimal performance
- Expect response times of 200-500ms depending on data volume

**Date Handling**: All dates use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)

---

## API Endpoints

### 1. Command Center Metrics

**Endpoint**: `GET /api/dashboard/command-center`

#### Purpose
Provides a comprehensive real-time snapshot of system health across anomalies, tickets, and alerts. This is your primary "mission control" metric set.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO string | No | 30 days ago | Start of date range for metrics |
| `endDate` | ISO string | No | Current time | End of date range for metrics |

#### Request Example

```
GET /api/dashboard/command-center?startDate=2026-02-01T00:00:00.000Z&endDate=2026-03-26T23:59:59.999Z
```

#### Response Structure

```json
{
  "success": true,
  "computedAt": "2026-03-26T14:30:00.000Z",
  "filters": {
    "startDate": "2026-02-01T00:00:00.000Z",
    "endDate": "2026-03-26T23:59:59.999Z"
  },
  "anomalies": {
    "active": 47,
    "critical": 12,
    "totalOccurrences": 1284,
    "affectedUsers": 523
  },
  "tickets": {
    "total": 34,
    "open": 8,
    "inProgress": 15,
    "resolved": 9,
    "closed": 2,
    "avgResolutionHours": 18.5,
    "recurringCount": 3
  },
  "alerts": {
    "total": 156,
    "bySeverity": {
      "critical": 23,
      "high": 45,
      "medium": 62,
      "low": 26
    },
    "byOutcome": {
      "ticket_created": 34,
      "false_positive": 12,
      "manually_resolved": 8,
      "auto_resolved": 45,
      "pending": 57
    }
  }
}
```

#### Field Descriptions

**Root Level**:
- `success` (boolean): Always `true` on successful response
- `computedAt` (ISO string): Timestamp when metrics were computed
- `filters` (object): Applied date filters (confirms your query params)

**Anomalies Object**:
- `active` (number): Anomalies in "new" or "alerted" state (requires attention)
- `critical` (number): Anomalies with severity level "critical" (highest priority)
- `totalOccurrences` (number): Sum of all anomaly occurrences in period
- `affectedUsers` (number): Total unique users impacted

**Tickets Object**:
- `total` (number): Total JIRA tickets created in period
- `open` (number): Tickets with status "open"
- `inProgress` (number): Tickets with status "in_progress"
- `resolved` (number): Tickets with status "resolved"
- `closed` (number): Tickets with status "closed"
- `avgResolutionHours` (number): Average time to resolve tickets (null if no resolved tickets)
- `recurringCount` (number): Tickets marked as recurring issues

**Alerts Object**:
- `total` (number): Total alerts generated in period
- `bySeverity` (object): Alert breakdown by severity level
- `byOutcome` (object): Alert outcomes (tracks alert lifecycle)

#### UI Component Recommendations

**1. Hero Metrics Cards**
Display the four key metrics as large stat cards:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Active Anomalies│  │ Critical Issues │  │ Open Tickets    │  │ Total Alerts    │
│      47 ⚠️      │  │      12 🔴      │  │      8 📋       │  │     156 📢      │
│   ↑ 12% (7d)   │  │   ↓ 3% (7d)    │  │  ← same (7d)   │  │   ↑ 8% (7d)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Design Tips**:
- Use color coding: Red (critical), Orange (active), Blue (info)
- Show trend indicators (compare to previous period)
- Make cards clickable to drill down into details
- Animate number changes when data refreshes

**2. Ticket Status Funnel**
Visualize ticket progression as a horizontal funnel:
```
Open (8) → In Progress (15) → Resolved (9) → Closed (2)
```

**Component**: Horizontal bar chart or funnel diagram
- Green gradient for left-to-right progression
- Click stages to filter ticket list
- Show avg resolution time below funnel

**3. Alert Severity Donut Chart**
Pie/donut chart for `bySeverity`:
```
        Critical (23) 🔴
        High (45) 🟠
        Medium (62) 🟡
        Low (26) 🟢
```

**4. Alert Outcome Breakdown**
Horizontal stacked bar showing alert efficiency:
```
Ticket Created ██████████ 34
Pending        ███████████████ 57
False Positive ████ 12
Auto Resolved  ████████ 45
Manual Resolve ███ 8
```

**Insight to highlight**: Ticket conversion rate = `ticket_created / total * 100`

#### Refresh Frequency
- **Real-time dashboard**: Every 30 seconds
- **Overview page**: Every 2-5 minutes
- **Background refresh**: Use polling or SSE

---

### 2. Alert History

**Endpoint**: `GET /api/dashboard/alert-history`

#### Purpose
Provides detailed alert records with conversion funnel metrics. Use this to analyze alert patterns, outcomes, and system performance in triaging issues.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO string | No | None | Filter alerts created after this date |
| `endDate` | ISO string | No | None | Filter alerts created before this date |
| `outcome` | string (enum) | No | None | Filter by outcome: `ticket_created`, `false_positive`, `manually_resolved`, `auto_resolved`, `pending` |
| `limit` | number | No | 100 | Max alerts to return |

#### Request Examples

```
GET /api/dashboard/alert-history?limit=50
GET /api/dashboard/alert-history?outcome=ticket_created&startDate=2026-03-01T00:00:00.000Z
```

#### Response Structure

```json
{
  "success": true,
  "computedAt": "2026-03-26T14:30:00.000Z",
  "filters": {
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": null,
    "outcome": "ticket_created",
    "limit": 50
  },
  "alerts": [
    {
      "_id": "660abc123def456789012345",
      "errorSignature": "NullPointerException_MainActivity_line_234",
      "alertType": "bug",
      "severityLevel": "critical",
      "totalOccurrences": 23,
      "uniqueUsers": 18,
      "sentAt": "2026-03-25T10:15:30.000Z",
      "outcome": "ticket_created",
      "outcomeRecordedAt": "2026-03-25T11:30:00.000Z",
      "anomalyGroupId": {
        "errorSignature": "NullPointerException_MainActivity_line_234",
        "tag": "crash",
        "errorType": "RuntimeError",
        "severityLevel": "critical"
      },
      "ticketId": {
        "jiraTicketId": "FALCON-123",
        "jiraUrl": "https://company.atlassian.net/browse/FALCON-123",
        "status": "in_progress"
      },
      "destination": "google_chat",
      "deliveryStatus": "delivered"
    }
  ],
  "conversion": {
    "totalAlerts": 156,
    "ticketsCreated": 34,
    "falsePositives": 12,
    "manuallyResolved": 8,
    "autoResolved": 45,
    "pending": 57,
    "ticketConversionRate": "21.79",
    "falsePositiveRate": "7.69"
  }
}
```

#### Field Descriptions

**Alerts Array** - Each alert object contains:
- `_id`: MongoDB alert ID
- `errorSignature`: Unique identifier for the issue type
- `alertType`: Type of alert (`bug`, `battery`, `bluetooth`, `activity`)
- `severityLevel`: Severity (`critical`, `high`, `medium`, `low`)
- `totalOccurrences`: Number of times this issue occurred when alert was sent
- `uniqueUsers`: Number of unique users affected
- `sentAt`: When alert was sent to destination
- `outcome`: Current outcome status (lifecycle tracking)
- `outcomeRecordedAt`: When outcome was set
- `anomalyGroupId`: Populated anomaly group details (error context)
- `ticketId`: Populated ticket details if ticket was created (null otherwise)
- `destination`: Where alert was sent (`google_chat`, `slack`, etc.)
- `deliveryStatus`: Delivery result (`delivered`, `failed`, `pending`)

**Conversion Object**:
- `totalAlerts`: Total alerts in period
- `ticketsCreated`: Alerts that resulted in JIRA tickets
- `falsePositives`: Alerts marked as false positives
- `manuallyResolved`: Alerts resolved manually without ticket
- `autoResolved`: Alerts auto-resolved (issue went away)
- `pending`: Alerts awaiting outcome decision
- `ticketConversionRate`: % of alerts converted to tickets (higher = more actionable alerts)
- `falsePositiveRate`: % of alerts that were false (lower = better accuracy)

#### UI Component Recommendations

**1. Alert Table (Primary View)**
Sortable, filterable data table with columns:
- Timestamp
- Error Signature (truncated, tooltip for full)
- Severity (colored badge)
- Type (icon + text)
- Occurrences
- Users Affected
- Outcome (status badge)
- Actions (View Details, Mark False Positive)

**Interactions**:
- Click row to see full alert details + related anomaly
- Filter dropdown for outcome
- Date range picker for temporal filtering
- Export to CSV button

**2. Conversion Funnel Visualization**
Sankey diagram or funnel showing alert flow:
```
156 Alerts
    ├── 34 → Ticket Created (21.79%)
    ├── 57 → Pending (36.54%)
    ├── 45 → Auto Resolved (28.85%)
    ├── 8 → Manually Resolved (5.13%)
    └── 12 → False Positive (7.69%)
```

**Color Coding**:
- Green: Auto/Manually Resolved
- Blue: Ticket Created
- Orange: Pending
- Red: False Positive

**3. Metrics Cards**
```
┌─────────────────────┐  ┌─────────────────────┐
│ Ticket Conversion   │  │ False Positive Rate │
│      21.79%         │  │       7.69%         │
│   Target: >15%      │  │   Target: <10%      │
└─────────────────────┘  └─────────────────────┘
```

**4. Timeline View (Alternative)**
Plot alerts on timeline with severity color coding, hover for details

**Insight Highlights**:
- Show "Alert Efficiency Score" based on conversion and FP rates
- Highlight patterns (e.g., "Most alerts occur on Mondays")
- Show top error signatures by alert count

#### Use Cases
- **Alert Triage**: Review pending alerts and assign outcomes
- **Performance Analysis**: Track false positive rate over time
- **Team Reporting**: Show conversion funnel to stakeholders
- **Process Improvement**: Identify why alerts don't convert to tickets

---

### 3. Anomaly Trend

**Endpoint**: `GET /api/dashboard/anomaly-trend`

#### Purpose
Tracks anomaly volume over time to identify patterns, spikes, and trends. Essential for understanding system health trajectory and detecting anomaly waves.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | number | No | 30 | Number of days to look back |

#### Request Example

```
GET /api/dashboard/anomaly-trend?days=7
```

#### Response Structure

```json
{
  "success": true,
  "computedAt": "2026-03-26T14:30:00.000Z",
  "days": 7,
  "trend": [
    { "date": "2026-03-20", "count": 12 },
    { "date": "2026-03-21", "count": 8 },
    { "date": "2026-03-22", "count": 15 },
    { "date": "2026-03-23", "count": 22 },
    { "date": "2026-03-24", "count": 9 },
    { "date": "2026-03-25", "count": 11 },
    { "date": "2026-03-26", "count": 18 }
  ]
}
```

#### Field Descriptions

**Root Level**:
- `success`: Request success indicator
- `computedAt`: Timestamp of metric computation
- `days`: Days included in trend (confirms query param)

**Trend Array** - Daily anomaly counts:
- `date` (YYYY-MM-DD): Date bucket
- `count`: Number of **unique anomaly groups** seen on this date (based on `lastSeenAt`)

**Important Note**: This counts anomaly groups, not individual occurrences. One group may have multiple occurrences in a day but counts as 1.

#### UI Component Recommendations

**1. Line Chart (Primary Visualization)**
Time-series line chart with:
```
   Count
    25 ┤         ●
    20 ┤       ●   ●
    15 ┤     ●       ●
    10 ┤   ●   ●       ●
     5 ┤ ●               ●
       └─────────────────────
        3/20  3/22  3/24  3/26
```

**Component Features**:
- X-axis: Date labels
- Y-axis: Anomaly count
- Hover tooltip: Show exact count + date
- Trend line (optional): Moving average overlay
- Threshold line: Mark "normal" anomaly rate
- Clickable points: Drill down to anomalies on that date

**Design Tips**:
- Use gradient fill under line for visual impact
- Red zone for counts above threshold
- Smooth curves for better aesthetics
- Responsive: Stack on mobile

**2. Bar Chart (Alternative)**
Vertical bar chart for discrete daily counts
- Better for comparing specific days
- Easier to read exact values

**3. Sparkline (Compact View)**
Mini trend line for dashboard overviews
```
Anomaly Trend (7d): ╱╲╱╲╱ [18]
```

**4. Summary Statistics Panel**
Display alongside chart:
```
┌─────────────────────┐
│ 7-Day Anomaly Stats │
├─────────────────────┤
│ Total:        95    │
│ Avg/Day:      13.6  │
│ Peak:         22    │
│ Peak Date:    3/23  │
│ Trend:        ↗ Up  │
└─────────────────────┘
```

**Insight Features**:
- Calculate trend direction: increasing/stable/decreasing
- Highlight anomaly spikes (>2x average)
- Compare to previous period (week-over-week)
- Show day-of-week patterns

#### Use Cases
- **Health Monitoring**: Detect anomaly volume increases
- **Release Impact**: Check if new releases cause anomaly spikes
- **Pattern Recognition**: Identify weekly/monthly patterns
- **Capacity Planning**: Forecast support team workload
- **SLA Tracking**: Ensure anomaly volume stays within bounds

#### Timeframe Options
Provide UI controls for different timeframes:
- 7 days (weekly view)
- 30 days (monthly view - default)
- 90 days (quarterly view)

---

### 4. Ticket Timeline

**Endpoint**: `GET /api/dashboard/ticket-timeline`

#### Purpose
Shows ticket creation and resolution trends over time, grouped by week. Helps visualize ticket backlog growth and team resolution velocity.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO string | No | 30 days ago | Start of timeline range |
| `endDate` | ISO string | No | Current time | End of timeline range |

#### Request Example

```
GET /api/dashboard/ticket-timeline?startDate=2026-01-01T00:00:00.000Z&endDate=2026-03-26T23:59:59.999Z
```

#### Response Structure

```json
{
  "success": true,
  "computedAt": "2026-03-26T14:30:00.000Z",
  "filters": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-03-26T23:59:59.999Z"
  },
  "timeline": [
    { "week": "2026-01-05", "created": 8, "resolved": 3 },
    { "week": "2026-01-12", "created": 12, "resolved": 7 },
    { "week": "2026-01-19", "created": 6, "resolved": 10 },
    { "week": "2026-01-26", "created": 15, "resolved": 8 },
    { "week": "2026-02-02", "created": 9, "resolved": 12 },
    { "week": "2026-02-09", "created": 11, "resolved": 9 },
    { "week": "2026-02-16", "created": 14, "resolved": 11 },
    { "week": "2026-02-23", "created": 7, "resolved": 13 },
    { "week": "2026-03-02", "created": 10, "resolved": 8 },
    { "week": "2026-03-09", "created": 13, "resolved": 10 },
    { "week": "2026-03-16", "created": 8, "resolved": 9 },
    { "week": "2026-03-23", "created": 11, "resolved": 6 }
  ]
}
```

#### Field Descriptions

**Root Level**:
- `success`: Request success indicator
- `computedAt`: Metric computation timestamp
- `filters`: Applied date range

**Timeline Array** - Weekly ticket metrics:
- `week` (YYYY-MM-DD): Start of week (Sunday)
- `created`: Tickets created during this week
- `resolved`: Tickets resolved or closed during this week

**Calculation Logic**:
- Weeks start on Sunday (week boundaries aligned)
- `resolved` includes both "resolved" and "closed" status tickets
- Limited to 1000 most recent tickets (performance optimization)

#### UI Component Recommendations

**1. Dual-Axis Area Chart (Primary)**
Overlapping area charts showing created vs resolved:
```
  15 ┤     ●─────●
     │    /  Created
  10 ┤   ●         ●─────●
     │  /  Resolved ╱─────╲
   5 ┤ ●─────●────●       ●
     └────────────────────────
      Jan    Feb    Mar
```

**Component Features**:
- Created tickets: Orange/Red area
- Resolved tickets: Green area
- Where green > orange: Good (catching up)
- Where orange > green: Bad (backlog growing)
- Crossover points: Critical inflection points

**2. Stacked Bar Chart (Alternative)**
Weekly bars showing created vs resolved side-by-side:
```
Week of 3/23: ████████  (11 created)
              ██████    (6 resolved)
```

**3. Velocity Metrics Panel**
Calculate and display team efficiency:
```
┌──────────────────────────┐
│ Team Velocity Metrics     │
├──────────────────────────┤
│ Avg Created/Week:    10.4 │
│ Avg Resolved/Week:   9.2  │
│ Net Backlog Change:  +1.2 │
│ Resolution Rate:     88%  │
│ Trend:          ⚠ Growing │
└──────────────────────────┘
```

**Calculations**:
- Resolution Rate = (Resolved / Created) * 100
- Net Backlog = Total Created - Total Resolved
- Trend: Positive (growing backlog) or Negative (decreasing backlog)

**4. Cumulative Line Chart**
Show running totals:
```
Running Backlog: 
  50 ┤              ╱──────
  40 ┤           ╱─╱
  30 ┤        ╱─╱
  20 ┤     ╱─╱
  10 ┤  ╱─╱
     └─────────────────────
      Jan    Feb    Mar
```

**Insight Features**:
- Highlight weeks with resolution > creation (wins!)
- Flag weeks with high creation spikes
- Show trend arrow: backlog increasing/decreasing
- Calculate "time to clear backlog" at current velocity

#### Use Cases
- **Team Performance**: Measure resolution velocity
- **Resource Planning**: Identify if team is understaffed
- **Sprint Planning**: Use historical data for capacity planning
- **Stakeholder Reporting**: Show progress on ticket backlog
- **Process Improvement**: Find bottlenecks in ticket flow

#### Design Considerations
- **Color coding**: Green for positive (resolving more), Red for negative (backlog growing)
- **Interactive**: Click week to see tickets created/resolved that week
- **Exportable**: Allow export for external reporting
- **Comparative**: Add previous period overlay

---

## Dashboard Design Guide

### Recommended Dashboard Layout

#### Page 1: Command Center (Real-Time Overview)
```
┌────────────────────────────────────────────────────────────┐
│                     COMMAND CENTER                         │
├──────────────┬──────────────┬──────────────┬──────────────┤
│ Active       │ Critical     │ Open         │ Total        │
│ Anomalies    │ Issues       │ Tickets      │ Alerts       │
│    47 ⚠️     │    12 🔴     │    8 📋      │   156 📢     │
└──────────────┴──────────────┴──────────────┴──────────────┘
├────────────────────────────┬──────────────────────────────┤
│  Ticket Status Funnel      │   Alert Severity Breakdown   │
│  ═══════════════════════   │         Donut Chart          │
│  Open → Progress → Done     │                              │
└────────────────────────────┴──────────────────────────────┘
├─────────────────────────────────────────────────────────── ┤
│                Alert Outcome Distribution                  │
│                  ═══════════════════════                   │
│                 Horizontal Stacked Bar                     │
└────────────────────────────────────────────────────────────┘
```

**Data Sources**: `/api/dashboard/command-center`  
**Refresh**: Every 30 seconds  
**Interactions**: Click metrics to drill down

#### Page 2: Trends & Analytics
```
┌────────────────────────────────────────────────────────────┐
│                      TRENDS OVERVIEW                       │
├────────────────────────────────────────────────────────────┤
│  Anomaly Trend (30d)                                       │
│  ───────────────────────────────────────────────────────── │
│          Line Chart                                        │
│  [7d] [30d] [90d]                                          │
└────────────────────────────────────────────────────────────┘
├────────────────────────────────────────────────────────────┤
│  Ticket Timeline                                           │
│  ───────────────────────────────────────────────────────── │
│          Dual-Axis Area Chart                              │
│          Created vs Resolved                               │
└────────────────────────────────────────────────────────────┘
├──────────────────────────┬─────────────────────────────────┤
│  Velocity Metrics        │    Weekly Summary Stats         │
│  • Avg Created: 10.4     │    • Best Week: Jan 26          │
│  • Avg Resolved: 9.2     │    • Worst Week: Mar 23         │
│  • Resolution Rate: 88%  │    • Trend: ↗ Improving        │
└──────────────────────────┴─────────────────────────────────┘
```

**Data Sources**: `/api/dashboard/anomaly-trend`, `/api/dashboard/ticket-timeline`  
**Refresh**: Every 5 minutes  
**Interactions**: Time range selectors, download reports

#### Page 3: Alert Management
```
┌────────────────────────────────────────────────────────────┐
│                 ALERT HISTORY & CONVERSION                 │
├──────────────┬─────────────────────────────────────────────┤
│ Conversion   │          Alert Funnel                       │
│ Metrics      │     ═══════════════════════                 │
│ • Conv: 22%  │     Sankey/Funnel Diagram                   │
│ • FP: 8%     │                                             │
└──────────────┴─────────────────────────────────────────────┘
├────────────────────────────────────────────────────────────┤
│  Alert History Table                                       │
│  ───────────────────────────────────────────────────────── │
│  [Filters: Date | Outcome | Severity]      [Export CSV]    │
│  ┌──────┬────────────┬──────────┬──────────┬──────────┐   │
│  │ Time │ Signature  │ Severity │ Outcome  │ Actions  │   │
│  ├──────┼────────────┼──────────┼──────────┼──────────┤   │
│  │ ...  │ ...        │ ...      │ ...      │ ...      │   │
│  └──────┴────────────┴──────────┴──────────┴──────────┘   │
└────────────────────────────────────────────────────────────┘
```

**Data Sources**: `/api/dashboard/alert-history`  
**Refresh**: On-demand (user-triggered)  
**Interactions**: Filters, sorting, drill-down to details

### UI Component Library Recommendations

**Chart Library**: Recharts, Chart.js, or Nivo (React)
- Line charts for trends
- Area charts for timeline
- Donut/Pie for severity distribution
- Horizontal bars for outcome breakdown
- Sankey diagrams for conversion funnel

**Data Table**: TanStack Table (React Table v8) or AG Grid
- Filtering and sorting out of the box
- Virtual scrolling for performance
- Export to CSV functionality

**Stat Cards**: Custom or Tremor (React)
- Large numbers with trend indicators
- Icon support
- Color theming

### Color Palette

**Severity Levels**:
- Critical: `#DC2626` (red-600)
- High: `#F97316` (orange-500)
- Medium: `#FBBF24` (yellow-400)
- Low: `#10B981` (green-500)

**Status Colors**:
- Active/Open: `#3B82F6` (blue-500)
- In Progress: `#8B5CF6` (purple-500)
- Resolved/Success: `#10B981` (green-500)
- Closed/Complete: `#6B7280` (gray-500)

**Alert Outcomes**:
- Ticket Created: `#3B82F6` (blue)
- Pending: `#F59E0B` (amber)
- False Positive: `#EF4444` (red)
- Resolved: `#10B981` (green)

---

## Data Refresh Strategy

### Polling Intervals

| Page | Endpoint | Refresh Rate | Rationale |
|------|----------|--------------|-----------|
| Command Center | `/command-center` | 30 seconds | Real-time monitoring requires frequent updates |
| Trends | `/anomaly-trend` | 5 minutes | Daily aggregates don't change often |
| Trends | `/ticket-timeline` | 5 minutes | Weekly aggregates are stable |
| Alert History | `/alert-history` | On-demand | Large dataset, user-triggered refresh |

### User Controls

Provide manual refresh buttons:
```
[🔄 Refresh Now]  Last updated: 2 minutes ago
```

Add auto-refresh toggle:
```
[  ] Auto-refresh (30s)
```

---

## Error Handling

### Standard Error Response

All dashboard APIs return consistent error structure:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes**:
- `200`: Success
- `500`: Internal server error (computation failure, DB error)

### Frontend Error Handling

#### Display Strategies

**1. Inline Error State**
```
┌─────────────────────────────────┐
│ ⚠️ Failed to load metrics      │
│ Server error occurred           │
│ [Retry]                         │
└─────────────────────────────────┘
```

**2. Toast Notification**
```
🚨 Dashboard data refresh failed. Retrying...
```

**3. Fallback to Cached Data**
Show last successful data with warning:
```
⚠️ Showing cached data (5 minutes old)
```

### Loading States

Show skeleton loaders while data loads:
```
┌─────────────────┐
│ ▓▓▓▓▓▓▓▓       │  <- Skeleton loading animation
│ ▓▓▓▓           │
└─────────────────┘
```

---

## Performance Notes

### Response Time Expectations

| Endpoint | Typical Response Time | Max Acceptable |
|----------|----------------------|----------------|
| `/command-center` | 200-400ms | 1000ms |
| `/alert-history` | 300-600ms | 2000ms |
| `/anomaly-trend` | 150-300ms | 1000ms |
| `/ticket-timeline` | 200-500ms | 1500ms |

### Optimization Tips

**1. Parallel Requests**
Fetch multiple endpoints in parallel when loading dashboard pages

**2. Conditional Rendering**
Only fetch data for visible tabs/sections

**3. Request Deduplication**
Use React Query or SWR to prevent duplicate requests when multiple components need same data

**4. Date Range Caching**
Cache responses by date range parameters

### Backend Performance Notes

- **No caching**: All metrics computed on-read
- **Parallel aggregation**: Command center uses `Promise.all` for concurrent DB queries
- **MongoDB aggregations**: Most queries use efficient aggregation pipelines
- **Index requirements**: Ensure indexes on `lastSeenAt`, `createdAt`, `status` fields

---

## Quick Reference: API Summary

| Endpoint | Method | Purpose | Key Params | Refresh Rate |
|----------|--------|---------|------------|--------------|
| `/command-center` | GET | Overview metrics | startDate, endDate | 30s |
| `/alert-history` | GET | Alert records + funnel | startDate, endDate, outcome, limit | On-demand |
| `/anomaly-trend` | GET | Daily anomaly counts | days | 5min |
| `/ticket-timeline` | GET | Weekly ticket stats | startDate, endDate | 5min |

---

**End of Document**
