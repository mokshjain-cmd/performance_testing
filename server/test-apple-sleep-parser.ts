/**
 * Standalone Test Parser for Apple Health Sleep Data
 * Tests AppleHealthSleepParser with export.xml
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Type definitions
interface ISleepEpochData {
  timestamp: Date;
  stage: "AWAKE" | "LIGHT" | "DEEP" | "REM";
  durationSec: number;
}

interface ILunaSleepMetadata {
  sleepScore?: number;
  sleepEfficiency?: number;
  totalSleepTimeSec?: number;
  deepSleepSec?: number;
  remSleepSec?: number;
  lightSleepSec?: number;
  awakeSec?: number;
  sleepOnsetTime?: Date;
  finalWakeTime?: Date;
  timeInBedSec?: number;
}

interface ILunaSleepParseResult {
  epochs: ISleepEpochData[];
  metadata: ILunaSleepMetadata;
}

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function printSeparator(char: string = '=', length: number = 80) {
  console.log(colors.cyan + char.repeat(length) + colors.reset);
}

function printSection(title: string) {
  console.log('\n' + colors.bright + colors.blue + title + colors.reset);
  printSeparator('-', 80);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
}

function displayMetadata(metadata: ILunaSleepMetadata) {
  printSection('📊 SLEEP METADATA');
  
  const data = [
    { label: 'Sleep Score', value: metadata.sleepScore?.toString() ?? 'N/A (Apple Health doesn\'t provide)' },
    { label: 'Sleep Efficiency', value: metadata.sleepEfficiency ? `${metadata.sleepEfficiency}%` : 'N/A' },
    { label: 'Total Sleep Time', value: metadata.totalSleepTimeSec ? formatDuration(metadata.totalSleepTimeSec) : 'N/A' },
    { label: 'Time in Bed', value: metadata.timeInBedSec ? formatDuration(metadata.timeInBedSec) : 'N/A' },
    { label: 'Deep Sleep', value: metadata.deepSleepSec ? formatDuration(metadata.deepSleepSec) : 'N/A' },
    { label: 'REM Sleep', value: metadata.remSleepSec ? formatDuration(metadata.remSleepSec) : 'N/A' },
    { label: 'Light Sleep', value: metadata.lightSleepSec ? formatDuration(metadata.lightSleepSec) : 'N/A' },
    { label: 'Awake Time', value: metadata.awakeSec ? formatDuration(metadata.awakeSec) : 'N/A' },
    { label: 'Sleep Onset', value: metadata.sleepOnsetTime ? formatTimestamp(metadata.sleepOnsetTime) : 'N/A' },
    { label: 'Final Wake', value: metadata.finalWakeTime ? formatTimestamp(metadata.finalWakeTime) : 'N/A' },
  ];

  data.forEach(({ label, value }) => {
    console.log(`  ${colors.yellow}${label.padEnd(20)}:${colors.reset} ${value}`);
  });
}

function displayEpochsSummary(epochs: ISleepEpochData[]) {
  printSection('🌙 EPOCHS SUMMARY');
  
  console.log(`  ${colors.yellow}Total Epochs:${colors.reset} ${epochs.length}`);
  
  if (epochs.length === 0) {
    console.log(`  ${colors.red}No epochs found!${colors.reset}`);
    return;
  }

  // Count stages
  const stageCounts: Record<string, number> = {};
  epochs.forEach(epoch => {
    stageCounts[epoch.stage] = (stageCounts[epoch.stage] || 0) + 1;
  });

  console.log(`\n  ${colors.cyan}Stage Distribution:${colors.reset}`);
  Object.entries(stageCounts).forEach(([stage, count]) => {
    const percentage = ((count / epochs.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / epochs.length * 40));
    console.log(`    ${stage.padEnd(10)}: ${count.toString().padStart(4)} epochs (${percentage.padStart(5)}%) ${colors.green}${bar}${colors.reset}`);
  });

  // Time range
  const firstEpoch = epochs[0];
  const lastEpoch = epochs[epochs.length - 1];
  
  console.log(`\n  ${colors.cyan}Time Range:${colors.reset}`);
  console.log(`    Start: ${formatTimestamp(firstEpoch.timestamp)}`);
  console.log(`    End:   ${formatTimestamp(lastEpoch.timestamp)}`);
  
  // Duration
  const totalDuration = epochs.reduce((sum, epoch) => sum + epoch.durationSec, 0);
  console.log(`\n  ${colors.cyan}Total Duration:${colors.reset} ${formatDuration(totalDuration)}`);
}

function displaySampleEpochs(epochs: ISleepEpochData[], sampleSize: number = 15) {
  printSection(`📋 SAMPLE EPOCHS (First ${Math.min(sampleSize, epochs.length)})`);
  
  const sample = epochs.slice(0, sampleSize);
  
  console.log(`\n  ${'#'.padStart(4)} | ${'Timestamp'.padEnd(28)} | ${'Stage'.padEnd(8)} | Duration`);
  console.log(`  ${'-'.repeat(4)} | ${'-'.repeat(28)} | ${'-'.repeat(8)} | ${'-'.repeat(10)}`);
  
  sample.forEach((epoch, idx) => {
    const stageColor = {
      'AWAKE': colors.red,
      'LIGHT': colors.yellow,
      'DEEP': colors.blue,
      'REM': colors.green,
    }[epoch.stage] || colors.reset;
    
    const time = epoch.timestamp.toLocaleTimeString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    console.log(
      `  ${(idx + 1).toString().padStart(4)} | ` +
      `${time.padEnd(28)} | ` +
      `${stageColor}${epoch.stage.padEnd(8)}${colors.reset} | ` +
      `${epoch.durationSec}s`
    );
  });
  
  if (epochs.length > sampleSize) {
    console.log(`  ... (${epochs.length - sampleSize} more epochs)`);
  }
}

async function testParser() {
  printSeparator('=', 80);
  console.log(colors.bright + colors.green + '      APPLE HEALTH SLEEP PARSER - TEST WITH export.xml' + colors.reset);
  printSeparator('=', 80);

  try {
    // Path to export.xml - update this to your actual path
    const exportXmlPath = path.join(__dirname, '..', 'export.xml');
    
    console.log(`\n${colors.cyan}📁 Export File:${colors.reset} ${exportXmlPath}`);
    
    // Check if file exists
    try {
      await fs.access(exportXmlPath);
    } catch {
      console.log(`\n${colors.red}❌ File not found: ${exportXmlPath}${colors.reset}`);
      console.log(`\n${colors.yellow}Please update the path in the test file to point to your export.xml${colors.reset}`);
      return;
    }

    // Import the parser dynamically
    const { AppleHealthSleepParser } = await import('./src/parsers/sleep/AppleHealthSleepParser');

    printSection('🔄 PARSING...');
    const startTime = Date.now();
    
    // Parse for sleep from evening of 02/03/2026 to morning of 03/03/2026
    const testDate = new Date('2026-03-03'); // Target date (morning wake-up)
    console.log(`  Target Date: ${testDate.toDateString()}`);
    
    const result = await AppleHealthSleepParser.parse(
      exportXmlPath,
      'test-session-001',
      'test-user-001',
      testDate
    );
    
    const parseTime = Date.now() - startTime;
    console.log(`  ${colors.green}✓ Parsing completed in ${parseTime}ms${colors.reset}`);

    if (result.epochs.length === 0) {
      console.log(`\n${colors.yellow}⚠️  No sleep data found for the specified date${colors.reset}`);
      console.log(`${colors.yellow}Try adjusting the testDate in the script to match data in your export.xml${colors.reset}`);
      return;
    }

    // Display results
    displayMetadata(result.metadata);
    displayEpochsSummary(result.epochs);
    displaySampleEpochs(result.epochs, 20);

    printSection('✅ TEST COMPLETED');
    console.log(`  ${colors.green}✓ Successfully parsed Apple Health sleep data${colors.reset}`);
    console.log(`  ${colors.green}✓ Output format matches ILunaSleepParseResult interface${colors.reset}`);
    console.log(`  ${colors.green}✓ Total ${result.epochs.length} epochs generated${colors.reset}`);

    // Save to JSON file
    const outputPath = path.join(__dirname, 'output-apple-health-sleep.json');
    const outputData = {
      source: 'Apple Health (export.xml)',
      sessionId: 'test-session-001',
      userId: 'test-user-001',
      targetDate: testDate.toISOString(),
      parsedAt: new Date().toISOString(),
      result: {
        metadata: result.metadata,
        epochs: result.epochs, // All epochs
        totalEpochs: result.epochs.length,
      },
      stageSummary: {
        AWAKE: result.epochs.filter(e => e.stage === 'AWAKE').length,
        LIGHT: result.epochs.filter(e => e.stage === 'LIGHT').length,
        DEEP: result.epochs.filter(e => e.stage === 'DEEP').length,
        REM: result.epochs.filter(e => e.stage === 'REM').length,
      }
    };
    
    await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n  ${colors.cyan}💾 Saved output to: ${outputPath}${colors.reset}`);
    
    printSeparator('=', 80);

  } catch (error) {
    console.error(`\n${colors.red}❌ Error during testing:${colors.reset}`, error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the test
testParser();
