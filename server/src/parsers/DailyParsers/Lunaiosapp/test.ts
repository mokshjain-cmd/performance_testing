/**
 * Quick test for iOS HR Parser
 * Tests parsing of the ZHDRingsLogs.txt sample provided
 */

import { LunaIOSHRParser } from './index';
import path from 'path';

async function testIOSParser() {
  try {
    const filePath = path.join(__dirname, '../../..', 'dummy-data', 'ZHDRingsLogs.txt');
    
    // Test with sample date range (2026-04-29)
    const startTime = new Date('2026-04-29T00:00:00Z');
    const endTime = new Date('2026-04-29T23:59:59Z');

    const meta = {
      sessionId: 'test-session-001',
      userId: 'test-user-001',
      activityType: 'sleep',
      firmwareVersion: 'V2.3.0',
      bandPosition: 'left',
    };

    console.log('\n🧪 Starting iOS HR Parser Test...');
    console.log('File:', filePath);
    console.log('Date: 2026-04-29');
    console.log('Time Range:', startTime.toISOString(), 'to', endTime.toISOString());
    console.log('-------------------------------------------\n');

    const readings = await LunaIOSHRParser.parse(filePath, meta, startTime, endTime);

    console.log('\n-------------------------------------------');
    console.log('✅ TEST PASSED: Parser executed successfully');
    console.log('Readings generated:', readings.length);
    
    if (readings.length > 0) {
      console.log('\nFirst 5 readings:');
      readings.slice(0, 5).forEach((r: any, idx: number) => {
        console.log(`  [${idx}] ${r.timestamp.toISOString()} -> HR: ${r.metrics.heartRate} bpm (valid: ${r.isValid})`);
      });

      console.log('\nLast 5 readings:');
      readings.slice(-5).forEach((r: any, idx: number) => {
        const actualIdx = readings.length - 5 + idx;
        console.log(`  [${actualIdx}] ${r.timestamp.toISOString()} -> HR: ${r.metrics.heartRate} bpm (valid: ${r.isValid})`);
      });

      // Verify timestamps are 30-second intervals
      if (readings.length >= 2) {
        const timeDiff = readings[1].timestamp.getTime() - readings[0].timestamp.getTime();
        const expectedDiff = 30 * 1000;
        if (timeDiff === expectedDiff) {
          console.log(`\n✅ Timestamp intervals correct: ${timeDiff / 1000} seconds`);
        } else {
          console.log(`\n⚠️  Timestamp intervals issue: expected ${expectedDiff / 1000}s, got ${timeDiff / 1000}s`);
        }
      }
    } else {
      console.log('\n⚠️  No readings generated - check if log date matches 2026-04-29');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testIOSParser();
