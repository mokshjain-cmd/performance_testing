# Test Suite Documentation

## Overview
This directory contains unit tests for the SPO2 ingestion functionality and metric-aware session details handling.

## Test Files

### 1. `parsers.spo2.test.ts`
Tests for SPO2 parser implementations (Masimo and Luna).

**Coverage:**
- File reading and CSV parsing
- Timestamp parsing and validation
- SPO2 value extraction and validation (0-100 range)
- Quality indicator handling (Spo2_Qi)
- Time range filtering
- Per-second aggregation (Luna)
- Error handling for malformed data
- Output format consistency

**Fixtures Needed:**
- `fixtures/masimo-spo2-sample.csv` - Sample Masimo SPO2 data
- `fixtures/luna-spo2-sample.csv` - Sample Luna SPO2 data with SySTime, Spo2_Qi, Spo2 columns

---

### 2. `ingestSPO2Session.test.ts`
Tests for SPO2 session ingestion service.

**Coverage:**
- Masimo device file processing
- Luna device file processing
- Multi-device session handling
- Session analysis triggering
- Summary updates (user accuracy, firmware performance, activity performance, daily trends, global summary, benchmark comparison)
- Temporary file cleanup
- Error handling and resilience
- Database operations (insertMany with ordered: false)
- Metric type propagation

**Mocked Dependencies:**
- All models (Session, Device, NormalizedReading)
- All parsers (masimoSpo2Parser, lunaSpo2Parser)
- All summary services

---

### 3. `sessionDetails.controller.test.ts`
Tests for session details controller with metric awareness.

**Coverage:**
- HR metric data fetching
- SPO2 metric data fetching
- Sleep metric data fetching
- Calories metric data fetching
- Steps metric data fetching
- Default metric behavior (HR)
- Response structure validation
- Point grouping by deviceType
- Time range filtering
- Error handling (404, 500)
- Query optimization (lean, projection, sorting)
- User population

**Mocked Dependencies:**
- Session model
- SessionAnalysis model
- NormalizedReading model

---

## Running Tests

### Prerequisites
Install testing dependencies:
```bash
npm install --save-dev jest ts-jest @types/jest
```

### Jest Configuration
Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/tests"],
    "testMatch": ["**/*.test.ts"],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts"
    ]
  }
}
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test parsers.spo2.test.ts

# Run with coverage
npm test:coverage

# Run in watch mode
npm test:watch
```

---

## TODO: Implement Tests
All test files currently contain placeholder test cases with TODO comments. Complete implementation requires:

1. **Create test fixtures:**
   - Sample CSV files for Masimo SPO2 data
   - Sample CSV files for Luna SPO2 data
   - Various edge cases (empty files, malformed data, out-of-range values)

2. **Implement mock setup:**
   - Mock Mongoose models with realistic data
   - Mock parser functions with sample outputs
   - Mock file system operations

3. **Write assertions:**
   - Replace TODO comments with actual test logic
   - Add expect() statements to verify behavior
   - Cover happy paths and error scenarios

4. **Add integration tests:**
   - Test full flow from file upload to database insertion
   - Test interaction between services
   - Test end-to-end metric handling

---

## Testing Best Practices

1. **Isolation:** Each test should be independent and not rely on others
2. **Mocking:** Mock external dependencies (database, file system, services)
3. **Coverage:** Aim for >80% code coverage for critical paths
4. **Clarity:** Use descriptive test names that explain what is being tested
5. **Edge Cases:** Test error conditions, nulls, empty arrays, boundary values
6. **Performance:** Mock heavy operations (file I/O, database queries)

---

## Example Test Implementation

Here's an example of what a completed test might look like:

```typescript
test('should parse valid Luna SPO2 CSV file', async () => {
  const testFile = path.join(__dirname, 'fixtures', 'luna-spo2-sample.csv');
  const readings = await parseLunaSpo2Csv(testFile, mockMeta, startTime, endTime);
  
  expect(readings).toBeDefined();
  expect(Array.isArray(readings)).toBe(true);
  expect(readings.length).toBeGreaterThan(0);
  
  // Verify structure
  expect(readings[0]).toHaveProperty('timestamp');
  expect(readings[0]).toHaveProperty('metrics.spo2');
  expect(readings[0]).toHaveProperty('meta.sessionId', mockMeta.sessionId);
  expect(readings[0]).toHaveProperty('isValid');
  
  // Verify SPO2 value range
  readings.forEach(reading => {
    if (reading.metrics.spo2 !== null) {
      expect(reading.metrics.spo2).toBeGreaterThanOrEqual(0);
      expect(reading.metrics.spo2).toBeLessThanOrEqual(100);
    }
  });
});
```

---

## Notes

- Tests are currently placeholders and need implementation
- Create `tests/fixtures/` directory for sample CSV files
- Consider adding E2E tests for complete user workflows
- Integration tests should use a test database (MongoDB memory server)
