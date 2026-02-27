# SPO2 Ingestion Implementation Guide

## Overview
This document describes the SPO2 ingestion infrastructure that has been created, mirroring the HR ingestion flow but using SPO2-specific parsers.

---

## Files Created

### 1. Parser Files

#### `/server/src/parsers/masimoSpo2Parser.ts`
- **Purpose:** Parse Masimo device SPO2 CSV files
- **Status:** Placeholder implementation
- **Function:** `parseMasimoSpo2Csv(filePath, meta, startTime, endTime)`
- **Returns:** `Promise<NormalizedReadingInput[]>`
- **TODO:** Implement actual Masimo CSV format parsing

#### `/server/src/parsers/lunaSpo2Parser.ts`
- **Purpose:** Parse Luna device SPO2 CSV files
- **Status:** Placeholder implementation
- **Function:** `parseLunaSpo2Csv(filePath, meta, startTime, endTime)`
- **Expected CSV Format:** `SySTime, Spo2_Qi, Spo2` (based on sample data)
- **Returns:** `Promise<NormalizedReadingInput[]>`
- **TODO:** Implement actual Luna SPO2 CSV parsing with:
  - Timestamp parsing from SySTime column
  - SPO2 value extraction from Spo2 column
  - Quality indicator handling from Spo2_Qi column
  - Per-second aggregation similar to Luna HR parser
  - Time range filtering

---

### 2. Service File

#### `/server/src/services/ingestSPO2Session.service.ts`
- **Purpose:** Ingest SPO2 session files from multiple devices
- **Status:** Complete implementation (uses placeholder parsers)
- **Function:** `ingestSPO2SessionFiles({ sessionId, userId, activityType, bandPosition, startTime, endTime, files })`
- **Supported Devices:** Masimo, Luna
- **Flow:**
  1. Process each uploaded file by device type
  2. Call appropriate SPO2 parser (Masimo or Luna)
  3. Insert readings into NormalizedReading collection
  4. Run session analysis
  5. Update all summary collections (user accuracy, firmware performance, activity performance, daily trends, global summary, benchmark comparison)
  6. Clean up temporary files

---

### 3. Test Files

#### `/server/tests/parsers.spo2.test.ts`
- **Purpose:** Unit tests for SPO2 parsers
- **Status:** Placeholder tests with TODO comments
- **Coverage:**
  - Masimo SPO2 parser tests
  - Luna SPO2 parser tests
  - Output format validation
  - Error handling

#### `/server/tests/ingestSPO2Session.test.ts`
- **Purpose:** Unit tests for SPO2 ingestion service
- **Status:** Placeholder tests with TODO comments
- **Coverage:**
  - File processing for both devices
  - Multi-device sessions
  - Analysis triggering
  - Summary updates
  - Error handling
  - Temp file cleanup

#### `/server/tests/sessionDetails.controller.test.ts`
- **Purpose:** Unit tests for metric-aware session details controller
- **Status:** Placeholder tests with TODO comments
- **Coverage:**
  - HR metric handling
  - SPO2 metric handling
  - Other metrics (Sleep, Calories, Steps)
  - Error handling
  - Response structure

#### `/server/tests/README.md`
- **Purpose:** Test suite documentation and setup instructions
- **Contains:** Test running instructions, Jest configuration, best practices

---

## Files Modified

### 1. `/server/src/parsers/index.ts`
**Changes:**
- Added exports for new SPO2 parsers:
  ```typescript
  export { parseMasimoSpo2Csv } from './masimoSpo2Parser';
  export { parseLunaSpo2Csv } from './lunaSpo2Parser';
  ```

### 2. `/server/src/controllers/sessionDetails.controller.ts`
**Changes:**
- Made metric-aware: now checks session.metric field
- Dynamically fetches appropriate metric data based on session type:
  - HR → fetches heartRate
  - SPO2 → fetches spo2
  - Sleep → fetches sleep
  - Calories → fetches calories
  - Steps → fetches steps
- Builds projection dynamically to only fetch required metric
- Returns metric-specific data in points object

**Before (hardcoded):**
```typescript
const readings = await NormalizedReading.find({...}, {
  timestamp: 1,
  'metrics.heartRate': 1,  // Always HR
  'meta.deviceType': 1,
  _id: 0
});
```

**After (dynamic):**
```typescript
const metric = session.metric || 'HR';
const projection: any = { timestamp: 1, 'meta.deviceType': 1, _id: 0 };

if (metric === 'HR') projection['metrics.heartRate'] = 1;
else if (metric === 'SPO2') projection['metrics.spo2'] = 1;
// ... etc

const readings = await NormalizedReading.find({...}, projection);
```

### 3. `/server/src/models/NormalizedReadings.ts`
**Changes:**
- Added new metric fields to support all session types:
  ```typescript
  metrics: {
    heartRate?: number | null;
    spo2?: number;
    stress?: number;
    skinTemp?: number;
    sleep?: number;        // NEW
    calories?: number;     // NEW
    steps?: number;        // NEW
  }
  ```

---

## Usage Guide

### How to Ingest SPO2 Sessions

Once the parsers are implemented, use the SPO2 ingestion service:

```typescript
import { ingestSPO2SessionFiles } from './services/ingestSPO2Session.service';

await ingestSPO2SessionFiles({
  sessionId: sessionDoc._id,
  userId: userId,
  activityType: 'running',
  bandPosition: 'wrist',
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T11:00:00Z'),
  files: [
    { fieldname: 'masimo', path: '/tmp/masimo.csv', filename: 'masimo.csv' },
    { fieldname: 'luna', path: '/tmp/luna-spo2.csv', filename: 'luna-spo2.csv' }
  ]
});
```

### Device Type Mapping

| Device Type | Parser Function | CSV Format |
|------------|----------------|------------|
| `masimo` | `parseMasimoSpo2Csv` | TODO: Define format |
| `luna` | `parseLunaSpo2Csv` | `SySTime, Spo2_Qi, Spo2` |

### Session Details API Response

When fetching session details, the response now adapts to the session's metric:

**HR Session Response:**
```json
{
  "success": true,
  "session": { "metric": "HR", ... },
  "points": {
    "luna": [
      { "timestamp": "2024-01-01T10:00:01Z", "metrics": { "heartRate": 72 } },
      { "timestamp": "2024-01-01T10:00:02Z", "metrics": { "heartRate": 73 } }
    ]
  }
}
```

**SPO2 Session Response:**
```json
{
  "success": true,
  "session": { "metric": "SPO2", ... },
  "points": {
    "masimo": [
      { "timestamp": "2024-01-01T10:00:01Z", "metrics": { "spo2": 98 } },
      { "timestamp": "2024-01-01T10:00:02Z", "metrics": { "spo2": 97 } }
    ]
  }
}
```

---

## Implementation TODO List

### High Priority

1. **Implement Masimo SPO2 Parser**
   - [ ] Identify Masimo CSV format (columns, timestamp format, SPO2 field)
   - [ ] Implement CSV parsing logic
   - [ ] Add quality indicator handling
   - [ ] Add time range filtering
   - [ ] Validate SPO2 values (0-100 range)

2. **Implement Luna SPO2 Parser**
   - [ ] Parse SySTime timestamp format
   - [ ] Extract Spo2 value from CSV
   - [ ] Use Spo2_Qi quality indicator for validation
   - [ ] Implement per-second aggregation (like Luna HR parser)
   - [ ] Filter readings by startTime/endTime

3. **Create Test Fixtures**
   - [ ] Create `tests/fixtures/masimo-spo2-sample.csv`
   - [ ] Create `tests/fixtures/luna-spo2-sample.csv`
   - [ ] Add edge case fixtures (empty, malformed, out-of-range)

4. **Implement Unit Tests**
   - [ ] Complete parser tests in `parsers.spo2.test.ts`
   - [ ] Complete service tests in `ingestSPO2Session.test.ts`
   - [ ] Complete controller tests in `sessionDetails.controller.test.ts`

5. **Set Up Jest**
   - [ ] Install dependencies: `npm install --save-dev jest ts-jest @types/jest`
   - [ ] Add Jest configuration to `package.json`
   - [ ] Add test scripts

### Medium Priority

6. **Integration with Upload Endpoint**
   - [ ] Update session controller to support SPO2 file uploads
   - [ ] Add route for SPO2 session creation
   - [ ] Handle device type validation for Masimo

7. **Frontend Updates**
   - [ ] Add Masimo device option to session form
   - [ ] Update file upload interface for SPO2 sessions
   - [ ] Display SPO2 data in session details view

### Low Priority

8. **Implement Other Metrics**
   - [ ] Create parsers for Sleep metric
   - [ ] Create parsers for Calories metric
   - [ ] Create parsers for Steps metric
   - [ ] Create corresponding ingestion services

---

## Architecture Comparison

### HR Ingestion Flow (Existing)
```
Upload HR Files → sessionIngestion.service
                 ↓
        [luna] → parseLunaCsv → NormalizedReading (heartRate)
        [polar] → parsePolarCsv → NormalizedReading (heartRate)
                 ↓
        analyzeSession → SessionAnalysis
                 ↓
        Update all summaries (metric='HR')
```

### SPO2 Ingestion Flow (New)
```
Upload SPO2 Files → ingestSPO2Session.service
                   ↓
        [masimo] → parseMasimoSpo2Csv → NormalizedReading (spo2)
        [luna] → parseLunaSpo2Csv → NormalizedReading (spo2)
                   ↓
        analyzeSession → SessionAnalysis
                   ↓
        Update all summaries (metric='SPO2')
```

---

## Notes

- All placeholder functions include detailed logging for debugging
- Parser placeholders return empty arrays by default
- The ingestion service is fully functional; only parsers need implementation
- Session details controller now supports all 5 metric types
- NormalizedReading model extended to support Sleep, Calories, Steps for future use
- All summary services already filter by metric (from previous implementation)

---

## Questions? Issues?

If you encounter issues or have questions:
1. Check parser placeholder comments for implementation hints
2. Review Luna HR parser (`lunaParser.ts`) as a reference
3. Examine test TODOs for expected behavior
4. Verify all metric types are handled in controller switch statements
