import { LunaSleepParser } from './src/parsers/sleep/LunaSleepParser';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test script to verify Luna Sleep Parser
 * Tests parsing of luna-logs-27.txt file
 */
async function testLunaSleepParser() {
  const logFilePath = '/Users/mokshjain/Desktop/performance testing platform/luna-logs-27.txt';
  const outputFilePath = path.join(__dirname, '../luna-sleep-parser-output.json');
  const testSessionId = new Types.ObjectId();
  const testUserId = new Types.ObjectId();
  
  // Test for date 27/02/2026 (should find sleep from night of 26th to morning of 27th)
  const targetDate = new Date('2026-02-27');
  
  try {
    console.log('🧪 Testing Luna Sleep Parser...\n');
    console.log(`📄 Log file: ${logFilePath}`);
    console.log(`💾 Output file: ${outputFilePath}`);
    console.log(`📅 Target date: 27/02/2026`);
    console.log(`🆔 Session ID: ${testSessionId}`);
    console.log(`👤 User ID: ${testUserId}\n`);
    console.log('─'.repeat(80) + '\n');
    
    const result = await LunaSleepParser.parse(
      logFilePath,
      testSessionId,
      testUserId,
      targetDate
    );
    
    console.log('\n' + '─'.repeat(80));
    console.log('📊 PARSING RESULTS\n');
    console.log(`✅ Total epochs parsed: ${result.epochs.length}`);
    
    if (result.epochs.length > 0) {
      const firstEpoch = result.epochs[0];
      const lastEpoch = result.epochs[result.epochs.length - 1];
      
      console.log(`\n⏰ Time Range:`);
      console.log(`   Start: ${firstEpoch.timestamp.toLocaleString()}`);
      console.log(`   End:   ${lastEpoch.timestamp.toLocaleString()}`);
      
      console.log(`\n📈 Metadata:`);
      console.log(`   Total Sleep Time: ${formatDuration(result.metadata.totalSleepTimeSec || 0)}`);
      console.log(`   Time in Bed: ${formatDuration(result.metadata.timeInBedSec || 0)}`);
      console.log(`   Deep Sleep: ${formatDuration(result.metadata.deepSleepSec || 0)}`);
      console.log(`   Light Sleep: ${formatDuration(result.metadata.lightSleepSec || 0)}`);
      console.log(`   REM Sleep: ${formatDuration(result.metadata.remSleepSec || 0)}`);
      console.log(`   Awake: ${formatDuration(result.metadata.awakeSec || 0)}`);
      
      // Stage breakdown
      const stageCount: Record<string, number> = {
        AWAKE: 0,
        LIGHT: 0,
        DEEP: 0,
        REM: 0
      };
      
      result.epochs.forEach(epoch => {
        stageCount[epoch.stage]++;
      });
      
      console.log(`\n📊 Stage Distribution:`);
      Object.entries(stageCount).forEach(([stage, count]) => {
        const percentage = ((count / result.epochs.length) * 100).toFixed(1);
        console.log(`   ${stage.padEnd(6)}: ${count.toString().padStart(4)} epochs (${percentage}%)`);
      });
      
      // Sample first 5 epochs
      
      // Prepare output data
      const outputData = {
        testInfo: {
          sessionId: testSessionId.toString(),
          userId: testUserId.toString(),
          targetDate: targetDate.toISOString(),
          logFile: logFilePath,
          parsedAt: new Date().toISOString()
        },
        metadata: result.metadata,
        summary: {
          totalEpochs: result.epochs.length,
          timeRange: {
            start: result.epochs[0]?.timestamp.toISOString(),
            end: result.epochs[result.epochs.length - 1]?.timestamp.toISOString()
          },
          stageDistribution: stageCount
        },
        epochs: result.epochs.map(epoch => ({
          timestamp: epoch.timestamp.toISOString(),
          timestampUnix: Math.floor(epoch.timestamp.getTime() / 1000),
          stage: epoch.stage,
          durationSec: epoch.durationSec
        }))
      };
      
      // Write to file
      fs.writeFileSync(outputFilePath, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Output saved to: ${outputFilePath}`);
      console.log(`\n🔍 Sample Epochs (first 5):`);
      result.epochs.slice(0, 5).forEach((epoch, idx) => {
        console.log(`   [${idx + 1}] ${epoch.timestamp.toLocaleTimeString()} - ${epoch.stage} (${epoch.durationSec}s)`);
      });
    }
    
    console.log('\n' + '─'.repeat(80));
    console.log('✨ Test completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error testing Luna Sleep Parser:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

function formatDuration(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${hours}h ${mins}m ${secs}s`;
}

// Run the test
testLunaSleepParser();
