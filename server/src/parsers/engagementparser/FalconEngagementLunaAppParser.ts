import fs from 'fs/promises';

/**
 * Parsed engagement data structure returned by the parser
 */
export interface EngagementData {
  date: Date;
  hr?: {
    dataPoints: number;
    avgHR: number;
    minHR: number;
    maxHR: number;
    wearTimeMinutes: number;
    timeSeries: Array<{ timestamp: Date; value: number }>;
  };
  sleep?: {
    sleepScore: number;
    startTime: Date;
    endTime: Date;
    totalSleepMinutes: number;
    stages: {
      awakeSec: number;
      deepSec: number;
      remSec: number;
      lightSec: number;
    };
    hypnograph: Array<{ timestamp: Date; stage: 'awake' | 'light' | 'deep' | 'rem' }>;
  };
  activity?: {
    steps: number;
    distanceMeters: number;
    caloriesTotal: number;
    caloriesActive: number;
    caloriesBasal: number;
    hourlySteps: number[];
  };
  spo2?: {
    dataPoints: number;
    avgSpO2: number;
    minSpO2: number;
    maxSpO2: number;
    timeSeries: Array<{ timestamp: Date; value: number }>;
  };
  workouts?: Array<{
    type: string;
    startTime: Date;
    durationMinutes: number;
    caloriesBurned: number;
  }>;
}

/**
 * Parser for Falcon/Luna Ring Android app logs
 * Extracts engagement metrics from daily sync logs
 */
export class FalconEngagementLunaAppParser {
  
  /**
   * Parse a Luna app log file and extract engagement data for a specific date
   * @param logFilePath - Path to the log file
   * @param targetDate - Date to extract data for (only returns data for this date)
   * @returns Parsed engagement data for the target date
   */
  async parseLogFile(logFilePath: string, targetDate: Date): Promise<EngagementData> {
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    const lines = logContent.split('\n');
    
    // Format target date as YYYY-MM-DD for matching
    const targetDateStr = this.formatDate(targetDate);
    
    // Storage for latest data entries (in case of multiple syncs)
    const hrEntries: Array<{ timestamp: Date; data: string }> = [];
    const spo2Entries: Array<{ timestamp: Date; data: string }> = [];
    const activityEntries: Array<{ timestamp: Date; data: string }> = [];
    const sleepEntries: Array<{ timestamp: Date; data: string }> = [];
    
    // Extract all relevant log entries for the target date
    for (const line of lines) {
      if (!line.includes('LUNA->')) continue;
      
      // Extract timestamp from log line
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/);
      if (!timestampMatch) continue;
      
      const logTimestamp = new Date(timestampMatch[1]);
      
      // Heart Rate Data
      if (line.includes('LUNA-> onContinuousHeartRateData')) {
        const dateMatch = line.match(/date='(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1] === targetDateStr) {
          hrEntries.push({ timestamp: logTimestamp, data: line });
        }
      }
      
      // SpO2 Data
      if (line.includes('LUNA-> onContinuousBloodOxygenData')) {
        const dateMatch = line.match(/date='(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1] === targetDateStr) {
          spo2Entries.push({ timestamp: logTimestamp, data: line });
        }
      }
      
      // Activity Data
      if (line.includes('LUNA-> onDailyData')) {
        const dateMatch = line.match(/date='(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1] === targetDateStr) {
          activityEntries.push({ timestamp: logTimestamp, data: line });
        }
      }
      
      // Sleep Data
      if (line.includes('LUNA-> onRingSleepResult')) {
        const dateMatch = line.match(/date='(\d{4}-\d{2}-\d{2})/);
        if (dateMatch && dateMatch[1] === targetDateStr) {
          sleepEntries.push({ timestamp: logTimestamp, data: line });
        }
      }
    }
    
    // Parse the LATEST entry for each metric (most accumulated data)
    const result: EngagementData = {
      date: targetDate
    };
    
    if (hrEntries.length > 0) {
      const latestHR = hrEntries[hrEntries.length - 1];
      result.hr = this.parseHRData(latestHR.data, targetDate);
    }
    
    if (spo2Entries.length > 0) {
      const latestSpO2 = spo2Entries[spo2Entries.length - 1];
      result.spo2 = this.parseSpO2Data(latestSpO2.data, targetDate);
    }
    
    if (activityEntries.length > 0) {
      const latestActivity = activityEntries[activityEntries.length - 1];
      result.activity = this.parseActivityData(latestActivity.data);
    }
    
    if (sleepEntries.length > 0) {
      const latestSleep = sleepEntries[sleepEntries.length - 1];
      result.sleep = this.parseSleepData(latestSleep.data);
    }
    
    return result;
  }
  
  /**
   * Parse heart rate data from log line
   * Format: ContinuousHeartRateBean{continuousHeartRateFrequency=5, heartRateData=[...], max=X, min=Y, ...}
   */
  private parseHRData(logLine: string, date: Date): EngagementData['hr'] {
    try {
      // Extract frequency
      const freqMatch = logLine.match(/continuousHeartRateFrequency=(\d+)/);
      const frequency = freqMatch ? parseInt(freqMatch[1]) : 5;
      
      // Extract HR array
      const dataMatch = logLine.match(/heartRateData=\[([\d,\s]+)\]/);
      if (!dataMatch) return undefined;
      
      const hrArray = dataMatch[1].split(',').map(v => parseInt(v.trim()));
      
      // Extract min/max
      const maxMatch = logLine.match(/max=(\d+)/);
      const minMatch = logLine.match(/min=(\d+)/);
      const maxHR = maxMatch ? parseInt(maxMatch[1]) : 0;
      const minHR = minMatch ? parseInt(minMatch[1]) : 0;
      
      // Calculate valid data points and average (exclude zeros)
      const validHRValues = hrArray.filter(v => v > 0);
      const dataPoints = validHRValues.length;
      const avgHR = dataPoints > 0 
        ? Math.round(validHRValues.reduce((sum, v) => sum + v, 0) / dataPoints)
        : 0;
      
      // Calculate wear time (number of valid readings * frequency in minutes)
      const wearTimeMinutes = dataPoints * frequency;
      
      // Create time series with timestamps
      const timeSeries = hrArray.map((value, index) => ({
        timestamp: new Date(date.getTime() + index * frequency * 60 * 1000),
        value
      }));
      
      return {
        dataPoints,
        avgHR,
        minHR,
        maxHR,
        wearTimeMinutes,
        timeSeries
      };
    } catch (error) {
      console.error('Error parsing HR data:', error);
      return undefined;
    }
  }
  
  /**
   * Parse SpO2 data from log line
   * Format: ContinuousBloodOxygenBean{bloodOxygenFrequency=15, bloodOxygenData=[...], max=X, min=Y, ...}
   */
  private parseSpO2Data(logLine: string, date: Date): EngagementData['spo2'] {
    try {
      // Extract frequency
      const freqMatch = logLine.match(/bloodOxygenFrequency=(\d+)/);
      const frequency = freqMatch ? parseInt(freqMatch[1]) : 15;
      
      // Extract SpO2 array
      const dataMatch = logLine.match(/bloodOxygenData=\[([\d,\s]+)\]/);
      if (!dataMatch) return undefined;
      
      const spo2Array = dataMatch[1].split(',').map(v => parseInt(v.trim()));
      
      // Extract min/max
      const maxMatch = logLine.match(/max=(\d+)/);
      const minMatch = logLine.match(/min=(\d+)/);
      const maxSpO2 = maxMatch ? parseInt(maxMatch[1]) : 0;
      const minSpO2 = minMatch ? parseInt(minMatch[1]) : 0;
      
      // Calculate valid data points and average (exclude zeros)
      const validSpO2Values = spo2Array.filter(v => v > 0);
      const dataPoints = validSpO2Values.length;
      const avgSpO2 = dataPoints > 0
        ? Math.round(validSpO2Values.reduce((sum, v) => sum + v, 0) / dataPoints)
        : 0;
      
      // Create time series with timestamps
      const timeSeries = spo2Array.map((value, index) => ({
        timestamp: new Date(date.getTime() + index * frequency * 60 * 1000),
        value
      }));
      
      return {
        dataPoints,
        avgSpO2,
        minSpO2,
        maxSpO2,
        timeSeries
      };
    } catch (error) {
      console.error('Error parsing SpO2 data:', error);
      return undefined;
    }
  }
  
  /**
   * Parse activity data from log line
   * Format: DailyBean{stepsData=[...], distanceData=[...], calorieData=[...], todayCalorieData=X, ...}
   */
  private parseActivityData(logLine: string): EngagementData['activity'] {
    try {
      // Extract steps array (hourly)
      const stepsMatch = logLine.match(/stepsData=\[([\d,\s]+)\]/);
      const hourlySteps = stepsMatch 
        ? stepsMatch[1].split(',').map(v => parseInt(v.trim()))
        : [];
      
      // Extract distance array (hourly, in meters)
      const distanceMatch = logLine.match(/distanceData=\[([\d,\s]+)\]/);
      const hourlyDistance = distanceMatch
        ? distanceMatch[1].split(',').map(v => parseInt(v.trim()))
        : [];
      
      // Extract calorie array (hourly)
      const calorieMatch = logLine.match(/calorieData=\[([\d,\s]+)\]/);
      const hourlyCalories = calorieMatch
        ? calorieMatch[1].split(',').map(v => parseInt(v.trim()))
        : [];
      
      // Calculate totals
      const steps = hourlySteps.reduce((sum, v) => sum + v, 0);
      const distanceMeters = hourlyDistance.reduce((sum, v) => sum + v, 0);
      const caloriesTotal = hourlyCalories.reduce((sum, v) => sum + v, 0);
      
      // Extract active calories (from todaySportCalorieData)
      const activeCalMatch = logLine.match(/todaySportCalorieData=(\d+)/);
      const caloriesActive = activeCalMatch ? parseInt(activeCalMatch[1]) : 0;
      
      // Basal calories = total - active
      const caloriesBasal = Math.max(0, caloriesTotal - caloriesActive);
      
      return {
        steps,
        distanceMeters,
        caloriesTotal,
        caloriesActive,
        caloriesBasal,
        hourlySteps
      };
    } catch (error) {
      console.error('Error parsing activity data:', error);
      return undefined;
    }
  }
  
  /**
   * Parse sleep data from log line
   * Format: RingSleepResultBean{sleepScore=X, entryTime=X, exitTime=Y, sleepDuration=Z, awakeTime=A, lightSleepTime=B, deepSleepTime=C, rapidEyeMovementTime=D, sleepDistributionData=[...]}
   */
  private parseSleepData(logLine: string): EngagementData['sleep'] {
    try {
      // Basic sleep metrics
      const sleepScoreMatch = logLine.match(/sleepScore=(\d+)/);
      const sleepScore = sleepScoreMatch ? parseInt(sleepScoreMatch[1]) : 0;
      
      const entryTimeMatch = logLine.match(/entryTime=(\d+)/);
      const exitTimeMatch = logLine.match(/exitTime=(\d+)/);
      
      if (!entryTimeMatch || !exitTimeMatch) return undefined;
      
      const startTime = new Date(parseInt(entryTimeMatch[1]) * 1000);
      const endTime = new Date(parseInt(exitTimeMatch[1]) * 1000);
      
      const durationMatch = logLine.match(/sleepDuration=(\d+)/);
      const totalSleepMinutes = durationMatch ? Math.round(parseInt(durationMatch[1]) / 60) : 0;
      
      // Sleep stages (in seconds)
      const awakeMatch = logLine.match(/awakeTime=(\d+)/);
      const lightMatch = logLine.match(/lightSleepTime=(\d+)/);
      const deepMatch = logLine.match(/deepSleepTime=(\d+)/);
      const remMatch = logLine.match(/rapidEyeMovementTime=(\d+)/);
      
      const stages = {
        awakeSec: awakeMatch ? parseInt(awakeMatch[1]) : 0,
        lightSec: lightMatch ? parseInt(lightMatch[1]) : 0,
        deepSec: deepMatch ? parseInt(deepMatch[1]) : 0,
        remSec: remMatch ? parseInt(remMatch[1]) : 0
      };
      
      // Parse sleep distribution (hypnograph)
      const hypnograph: Array<{ timestamp: Date; stage: 'awake' | 'light' | 'deep' | 'rem' }> = [];
      
      // Extract distribution data
      const distMatch = logLine.match(/sleepDistributionData=\[(.*?)\]/);
      if (distMatch) {
        const distributions = this.extractSleepDistributions(distMatch[1]);
        
        for (const dist of distributions) {
          const stageType = this.mapSleepStage(dist.type);
          const segmentDuration = dist.duration;
          const segmentStart = new Date(dist.startTimestamp * 1000);
          
          // Create minute-by-minute entries for this segment
          const minutesInSegment = Math.ceil(segmentDuration / 60);
          for (let i = 0; i < minutesInSegment; i++) {
            hypnograph.push({
              timestamp: new Date(segmentStart.getTime() + i * 60 * 1000),
              stage: stageType
            });
          }
        }
      }
      
      return {
        sleepScore,
        startTime,
        endTime,
        totalSleepMinutes,
        stages,
        hypnograph
      };
    } catch (error) {
      console.error('Error parsing sleep data:', error);
      return undefined;
    }
  }
  
  /**
   * Extract sleep distribution segments from the distribution string
   */
  private extractSleepDistributions(distStr: string): Array<{ startTimestamp: number; duration: number; type: number }> {
    const distributions: Array<{ startTimestamp: number; duration: number; type: number }> = [];
    
    // Match pattern: SleepDistribution{startTimestamp=X, sleepDuration=Y, sleepDistributionType=Z}
    const regex = /SleepDistribution\{startTimestamp=(\d+),\s*sleepDuration=(\d+),\s*sleepDistributionType=(\d+)\}/g;
    let match;
    
    while ((match = regex.exec(distStr)) !== null) {
      distributions.push({
        startTimestamp: parseInt(match[1]),
        duration: parseInt(match[2]),
        type: parseInt(match[3])
      });
    }
    
    return distributions;
  }
  
  /**
   * Map Luna sleep stage type to standard stage name
   * 0 = awake, 1 = light, 2 = deep, 3 = rem
   */
  private mapSleepStage(type: number): 'awake' | 'light' | 'deep' | 'rem' {
    switch (type) {
      case 0: return 'awake';
      case 1: return 'light';
      case 2: return 'deep';
      case 3: return 'rem';
      default: return 'light';
    }
  }
  
  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Export singleton instance
export const falconEngagementLunaAppParser = new FalconEngagementLunaAppParser();
