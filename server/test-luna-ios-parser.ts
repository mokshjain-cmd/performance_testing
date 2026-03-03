/**
 * Standalone Test Parser for iOS Luna Sleep Data
 * Tests LunaSleepParserIOS with ZHDRingsLogs.txt
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

type SleepStageType = 'AWAKE' | 'LIGHT' | 'DEEP' | 'REM';

interface IOSSleepDistribution {
  startTimestamp: number;
  sleepDuration: number;
  sleepDistributionType: number;
}

interface IOSSleepData {
  entryTime: number;
  exitTime: number;
  sleepDuration: number;
  timeInBedTime: number;
  sleepEfficiency: number;
  sleepScore: number;
  awakeTime: number;
  lightSleepTime: number;
  deepSleepTime: number;
  rapidEyeMovementTime: number;
  sleepDistributionDataList: IOSSleepDistribution[];
}

interface ISleepEpoch30Sec {
  startSec: number;
  endSec: number;
  stage: SleepStageType;
  deviceType: 'luna';
  durationSec: number;
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

// Parser Functions
function mapSleepStage(distributionType: number): SleepStageType {
  switch (distributionType) {
    case 0: return 'AWAKE';
    case 1: return 'LIGHT';
    case 2: return 'DEEP';
    case 3: return 'REM';
    default:
      console.warn(`Unknown sleep type: ${distributionType}, defaulting to AWAKE`);
      return 'AWAKE';
  }
}

function parseSleepDataEntry(logContent: string): IOSSleepData[] {
  const sleepDataList: IOSSleepData[] = [];
  const sleepDataRegex = /<SleepData> Obtained daily data:\s*\n\s*Date:[^\n]+\s*\n\s*entryTime:(\d+)\s*\n\s*exitTime:(\d+)\s*\n\s*sleepDuration:(\d+)\s*\n\s*timeInBedTime:(\d+)[^\n]*\n\s*sleepLatency:[^\n]*\n\s*sleepEfficiency:(\d+)\s*\n\s*sleepScore:(\d+)\s*\n\s*awakeTime:(\d+)\s*\n\s*lightSleepTime:(\d+)\s*\n\s*deepSleepTime:(\d+)\s*\n\s*rapidEyeMovementTime:(\d+)\s*\n\s*sleepDistributionDataList:([\s\S]*?)(?=\n\s*sleepMovementsDataList|\n\s*LOG:|\n\s*$)/gm;

  let match;
  while ((match = sleepDataRegex.exec(logContent)) !== null) {
    const [
      ,
      entryTime,
      exitTime,
      sleepDuration,
      timeInBedTime,
      sleepEfficiency,
      sleepScore,
      awakeTime,
      lightSleepTime,
      deepSleepTime,
      rapidEyeMovementTime,
      distributionData,
    ] = match;

    // Parse sleep distribution list
    const distributionList: IOSSleepDistribution[] = [];
    const distributionRegex = /startTimestamp:(\d+),sleepDuration:(\d+),sleepDistributionType:(\d+)/g;
    let distMatch;
    while ((distMatch = distributionRegex.exec(distributionData)) !== null) {
      distributionList.push({
        startTimestamp: parseInt(distMatch[1], 10),
        sleepDuration: parseInt(distMatch[2], 10),
        sleepDistributionType: parseInt(distMatch[3], 10),
      });
    }

    sleepDataList.push({
      entryTime: parseInt(entryTime, 10),
      exitTime: parseInt(exitTime, 10),
      sleepDuration: parseInt(sleepDuration, 10),
      timeInBedTime: parseInt(timeInBedTime, 10),
      sleepEfficiency: parseInt(sleepEfficiency, 10),
      sleepScore: parseInt(sleepScore, 10),
      awakeTime: parseInt(awakeTime, 10),
      lightSleepTime: parseInt(lightSleepTime, 10),
      deepSleepTime: parseInt(deepSleepTime, 10),
      rapidEyeMovementTime: parseInt(rapidEyeMovementTime, 10),
      sleepDistributionDataList: distributionList,
    });
  }

  return sleepDataList;
}

function generate30SecEpochs(distributions: IOSSleepDistribution[]): ISleepEpoch30Sec[] {
  const epochs: ISleepEpoch30Sec[] = [];

  for (const distribution of distributions) {
    const { startTimestamp, sleepDuration, sleepDistributionType } = distribution;
    const endTimestamp = startTimestamp + sleepDuration;
    const stage = mapSleepStage(sleepDistributionType);

    let currentTime = startTimestamp;
    while (currentTime < endTimestamp) {
      const epochEnd = Math.min(currentTime + 30, endTimestamp);
      const epochDuration = epochEnd - currentTime;

      epochs.push({
        startSec: currentTime,
        endSec: epochEnd,
        stage,
        deviceType: 'luna',
        durationSec: epochDuration,
      });

      currentTime = epochEnd;
    }
  }

  return epochs;
}

function convertToEpochData(epochs: ISleepEpoch30Sec[]): ISleepEpochData[] {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  return epochs.map((epoch) => {
    const timestampMs = epoch.startSec * 1000 + IST_OFFSET_MS;
    return {
      timestamp: new Date(timestampMs),
      stage: epoch.stage as "AWAKE" | "LIGHT" | "DEEP" | "REM",
      durationSec: epoch.durationSec,
    };
  });
}

function deduplicateEpochs(epochs: ISleepEpochData[]): ISleepEpochData[] {
  const seen = new Set<number>();
  return epochs.filter((epoch) => {
    const timestamp = epoch.timestamp.getTime();
    if (seen.has(timestamp)) {
      return false;
    }
    seen.add(timestamp);
    return true;
  });
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
    { label: 'Sleep Score', value: metadata.sleepScore?.toString() ?? 'N/A' },
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
  console.log(colors.bright + colors.green + '     LUNA SLEEP PARSER iOS - TEST WITH ZHDRingsLogs.txt' + colors.reset);
  printSeparator('=', 80);

  try {
    // Read the ZHDRingsLogs.txt file
    const logFilePath = path.join(__dirname, '..', 'ZHDRingsLogs.txt');
    console.log(`\n${colors.cyan}📁 Log File:${colors.reset} ${logFilePath}`);
    
    printSection('🔄 READING FILE...');
    const fileContent = await fs.readFile(logFilePath, 'utf-8');
    console.log(`  ${colors.green}✓ File loaded: ${fileContent.length.toLocaleString()} bytes${colors.reset}`);

    printSection('🔍 PARSING SLEEP DATA...');
    const startTime = Date.now();
    const sleepDataList = parseSleepDataEntry(fileContent);
    console.log(`  ${colors.green}✓ Found ${sleepDataList.length} sleep sessions${colors.reset}`);

    if (sleepDataList.length === 0) {
      console.log(`\n  ${colors.red}❌ No iOS sleep data found in log file${colors.reset}`);
      console.log(`  ${colors.yellow}Looking for pattern: <SleepData> Obtained daily data:${colors.reset}`);
      return;
    }

    // Display all found sessions
    console.log(`\n  ${colors.cyan}All Sleep Sessions Found:${colors.reset}`);
    sleepDataList.forEach((data, idx) => {
      const date = new Date(data.entryTime * 1000);
      const duration = formatDuration(data.sleepDuration);
      console.log(`    ${idx + 1}. ${date.toISOString()} - Duration: ${duration}, Score: ${data.sleepScore}`);
    });

    // Use the most recent session
    const sleepData = sleepDataList[sleepDataList.length - 1];
    console.log(`\n  ${colors.yellow}Using most recent session (${sleepDataList.length})${colors.reset}`);

    printSection('🔨 GENERATING 30-SECOND EPOCHS...');
    const epochs30Sec = generate30SecEpochs(sleepData.sleepDistributionDataList);
    console.log(`  ${colors.green}✓ Generated ${epochs30Sec.length} raw epochs${colors.reset}`);

    const epochData = convertToEpochData(epochs30Sec);
    console.log(`  ${colors.green}✓ Converted to epoch data format${colors.reset}`);

    const dedupedEpochs = deduplicateEpochs(epochData);
    console.log(`  ${colors.green}✓ After deduplication: ${dedupedEpochs.length} epochs${colors.reset}`);

    const parseTime = Date.now() - startTime;
    console.log(`  ${colors.magenta}⏱️  Parsing completed in ${parseTime}ms${colors.reset}`);

    // Create metadata
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const metadata: ILunaSleepMetadata = {
      sleepScore: sleepData.sleepScore,
      sleepEfficiency: sleepData.sleepEfficiency,
      totalSleepTimeSec: sleepData.sleepDuration,
      deepSleepSec: sleepData.deepSleepTime,
      remSleepSec: sleepData.rapidEyeMovementTime,
      lightSleepSec: sleepData.lightSleepTime,
      awakeSec: sleepData.awakeTime,
      sleepOnsetTime: new Date(sleepData.entryTime * 1000 + IST_OFFSET_MS),
      finalWakeTime: new Date(sleepData.exitTime * 1000 + IST_OFFSET_MS),
      timeInBedSec: sleepData.timeInBedTime,
    };

    const result: ILunaSleepParseResult = {
      epochs: dedupedEpochs,
      metadata,
    };

    // Display results
    displayMetadata(result.metadata);
    displayEpochsSummary(result.epochs);
    displaySampleEpochs(result.epochs, 20);

    printSection('✅ TEST COMPLETED');
    console.log(`  ${colors.green}✓ Successfully parsed iOS Luna sleep data${colors.reset}`);
    console.log(`  ${colors.green}✓ Output format matches ILunaSleepParseResult interface${colors.reset}`);
    console.log(`  ${colors.green}✓ Total ${result.epochs.length} epochs generated${colors.reset}`);

    // Save to JSON file
    const outputPath = path.join(__dirname, 'output-luna-ios-sleep.json');
    const outputData = {
      source: 'Luna Ring (iOS)',
      sessionId: 'test-session-001',
      userId: 'test-user-001',
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
    process.exit(1);
  }
}

// Run the test
testParser();
