import DailyEngagementMetrics from '../models/DailyEngagementMetrics';
import User from '../models/Users';
import path from 'path';
import fs from 'fs/promises';
import { falconEngagementLunaAppParser, EngagementData } from '../parsers/engagementparser';

interface ParsedLogData {
  hr?: {
    dataPoints: number;
    avgHR: number;
    minHR: number;
    maxHR: number;
    wearTimeMinutes: number;
    timeSeries?: Array<{ timestamp: Date; value: number }>;
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
    hypnograph?: Array<{ timestamp: Date; stage: 'awake' | 'light' | 'deep' | 'rem' }>;
  };
  activity?: {
    steps: number;
    distanceMeters: number;
    caloriesTotal: number;
    caloriesActive: number;
    caloriesBasal: number;
    hourlySteps?: number[];
  };
  spo2?: {
    dataPoints: number;
    avgSpO2: number;
    minSpO2: number;
    maxSpO2: number;
    timeSeries?: Array<{ timestamp: Date; value: number }>;
  };
  workouts?: Array<{
    type: string;
    startTime: Date;
    durationMinutes: number;
    caloriesBurned: number;
  }>;
}

export class EngagementService {
  
  /**
   * Process a single log file for a user
   */
  async processLogFile(
    logFilePath: string,
    userId: string,
    date: Date
  ): Promise<void> {
    try {
      console.log(`📝 Processing log file for user ${userId}: ${logFilePath}`);
      
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }
      
      // Parse the log file with the target date
      const parsedData = await this.parseLogFile(logFilePath, date);
      
      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(parsedData);
      
      // Get metrics collected
      const metricsCollected = this.getMetricsCollected(parsedData);
      
      // Store in database (upsert to handle duplicates)
      await DailyEngagementMetrics.findOneAndUpdate(
        { userId, date },
        {
          userId,
          date,
          deviceType: 'luna', // Default to luna, adjust as needed
          logFileName: path.basename(logFilePath),
          uploadedAt: new Date(),
          parsedAt: new Date(),
          
          hr: {
            hasData: !!parsedData.hr,
            dataPoints: parsedData.hr?.dataPoints || 0,
            avgHR: parsedData.hr?.avgHR,
            minHR: parsedData.hr?.minHR,
            maxHR: parsedData.hr?.maxHR,
            wearTimeMinutes: parsedData.hr?.wearTimeMinutes,
            timeSeries: parsedData.hr?.timeSeries || [],
          },
          
          sleep: {
            hasData: !!parsedData.sleep,
            sleepScore: parsedData.sleep?.sleepScore,
            startTime: parsedData.sleep?.startTime,
            endTime: parsedData.sleep?.endTime,
            totalSleepMinutes: parsedData.sleep?.totalSleepMinutes,
            stages: parsedData.sleep?.stages,
            hypnograph: parsedData.sleep?.hypnograph || [],
          },
          
          activity: {
            hasData: !!parsedData.activity,
            steps: parsedData.activity?.steps,
            distanceMeters: parsedData.activity?.distanceMeters,
            caloriesTotal: parsedData.activity?.caloriesTotal,
            caloriesActive: parsedData.activity?.caloriesActive,
            caloriesBasal: parsedData.activity?.caloriesBasal,
            hourlySteps: parsedData.activity?.hourlySteps?.map((steps, hour) => ({ hour, steps })) || [],
          },
          
          spo2: {
            hasData: !!parsedData.spo2,
            dataPoints: parsedData.spo2?.dataPoints || 0,
            avgSpO2: parsedData.spo2?.avgSpO2,
            minSpO2: parsedData.spo2?.minSpO2,
            maxSpO2: parsedData.spo2?.maxSpO2,
            timeSeries: parsedData.spo2?.timeSeries || [],
          },
          
          workouts: parsedData.workouts || [],
          
          engagementScore,
          metricsCollected,
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Processed log for user ${userId} on ${date.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error(`❌ Error processing log file ${logFilePath}:`, error);
      throw error;
    }
  }
  
  /**
   * Parse log file and extract metrics using Falcon Engagement Luna App Parser
   */
  private async parseLogFile(logFilePath: string, date: Date): Promise<ParsedLogData> {
    try {
      // Use the Falcon Engagement Luna App Parser
      const engagementData: EngagementData = await falconEngagementLunaAppParser.parseLogFile(logFilePath, date);
      
      // Map the EngagementData to ParsedLogData format
      const parsedData: ParsedLogData = {};
      
      // Map HR data with timeSeries
      if (engagementData.hr && engagementData.hr.dataPoints > 0) {
        parsedData.hr = {
          dataPoints: engagementData.hr.dataPoints,
          avgHR: engagementData.hr.avgHR,
          minHR: engagementData.hr.minHR,
          maxHR: engagementData.hr.maxHR,
          wearTimeMinutes: engagementData.hr.wearTimeMinutes,
          timeSeries: engagementData.hr.timeSeries // Save time-series data
        };
      }
      
      // Map Sleep data with hypnograph
      if (engagementData.sleep) {
        parsedData.sleep = {
          sleepScore: engagementData.sleep.sleepScore,
          startTime: engagementData.sleep.startTime,
          endTime: engagementData.sleep.endTime,
          totalSleepMinutes: engagementData.sleep.totalSleepMinutes,
          stages: engagementData.sleep.stages,
          hypnograph: engagementData.sleep.hypnograph // Save hypnograph data
        };
      }
      
      // Map Activity data with hourly breakdown
      if (engagementData.activity) {
        parsedData.activity = {
          steps: engagementData.activity.steps,
          distanceMeters: engagementData.activity.distanceMeters,
          caloriesTotal: engagementData.activity.caloriesTotal,
          caloriesActive: engagementData.activity.caloriesActive,
          caloriesBasal: engagementData.activity.caloriesBasal,
          hourlySteps: engagementData.activity.hourlySteps // Save hourly steps
        };
      }
      
      // Map SpO2 data with timeSeries
      if (engagementData.spo2 && engagementData.spo2.dataPoints > 0) {
        parsedData.spo2 = {
          dataPoints: engagementData.spo2.dataPoints,
          avgSpO2: engagementData.spo2.avgSpO2,
          minSpO2: engagementData.spo2.minSpO2,
          maxSpO2: engagementData.spo2.maxSpO2,
          timeSeries: engagementData.spo2.timeSeries // Save time-series data
        };
      }
      
      // Map Workouts data
      if (engagementData.workouts && engagementData.workouts.length > 0) {
        parsedData.workouts = engagementData.workouts;
      }
      
      return parsedData;
    } catch (error) {
      console.error('Error parsing log file with Falcon Engagement Parser:', error);
      throw error;
    }
  }
  
  /**
   * Calculate engagement score (0-100) based on data collected
   */
  private calculateEngagementScore(data: ParsedLogData): number {
    let score = 0;
    
    // HR data: 25 points (more wear time = higher score)
    if (data.hr) {
      const wearTimeScore = Math.min((data.hr.wearTimeMinutes / (24 * 60)) * 25, 25);
      score += wearTimeScore;
    }
    
    // Sleep data: 25 points
    if (data.sleep) {
      score += 25;
    }
    
    // Activity data: 25 points
    if (data.activity) {
      score += 25;
    }
    
    // SpO2 data: 15 points
    if (data.spo2) {
      const spo2Score = Math.min((data.spo2.dataPoints / 10) * 15, 15);
      score += spo2Score;
    }
    
    // Workout data: 10 points bonus
    if (data.workouts && data.workouts.length > 0) {
      score += 10;
    }
    
    return Math.round(Math.min(score, 100));
  }
  
  /**
   * Get list of metrics collected
   */
  private getMetricsCollected(data: ParsedLogData): string[] {
    const metrics: string[] = [];
    
    if (data.hr) metrics.push('HR');
    if (data.sleep) metrics.push('Sleep');
    if (data.activity) metrics.push('Activity');
    if (data.spo2) metrics.push('SpO2');
    if (data.workouts && data.workouts.length > 0) metrics.push('Workouts');
    
    return metrics;
  }
  
  /**
   * Get user engagement summary
   */
  async getUserEngagementSummary(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const metrics = await DailyEngagementMetrics.find({
      userId,
      date: { $gte: startDate }
    })
    .sort({ date: -1 })
    .limit(days);
    
    // Calculate summary stats
    const totalDays = metrics.length;
    const avgEngagementScore = totalDays > 0
      ? metrics.reduce((sum, m) => sum + m.engagementScore, 0) / totalDays
      : 0;
    
    const lastActiveDate = metrics[0]?.date || null;
    const consecutiveInactiveDays = this.calculateInactiveDays(metrics);
    
    // Determine status
    let status: 'active' | 'declining' | 'inactive' = 'active';
    if (consecutiveInactiveDays >= 14) {
      status = 'inactive';
    } else if (consecutiveInactiveDays >= 3 || avgEngagementScore < 40) {
      status = 'declining';
    }
    
    return {
      userId,
      totalDays,
      avgEngagementScore: Math.round(avgEngagementScore),
      lastActiveDate,
      consecutiveInactiveDays,
      status,
      metrics
    };
  }
  
  /**
   * Calculate consecutive inactive days
   */
  private calculateInactiveDays(metrics: any[]): number {
    if (!metrics || metrics.length === 0) {
      return 999; // No data = inactive forever
    }
    
    const lastMetric = metrics[0];
    const lastActiveDate = new Date(lastMetric.date);
    const today = new Date();
    
    const diffTime = Math.abs(today.getTime() - lastActiveDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  /**
   * Get all users engagement overview
   */
  async getAllUsersEngagement() {
    const users = await User.find({ role: 'tester' });
    
    const engagementOverviews = await Promise.all(
      users.map(async (user) => {
        const summary = await this.getUserEngagementSummary(user._id.toString(), 7);
        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          lastActiveDate: summary.lastActiveDate,
          consecutiveInactiveDays: summary.consecutiveInactiveDays,
          status: summary.status,
          totalDays: summary.totalDays,
          avgEngagementScore: summary.avgEngagementScore,
          metrics: summary.metrics
        };
      })
    );
    
    // Sort by status (inactive first) and then by consecutive inactive days
    return engagementOverviews.sort((a, b) => {
      const statusOrder = { inactive: 0, declining: 1, active: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.consecutiveInactiveDays - a.consecutiveInactiveDays;
    });
  }

  /**
   * Get users list with basic engagement info (optimized for UI list)
   * Returns: userId, name, email, lastActiveDate, status, avgScore
   */
  async getUsersList() {
    const users = await User.find({ role: 'tester' }).lean();
    
    // Get latest metric for each user using aggregation
    const latestMetrics = await DailyEngagementMetrics.aggregate([
      {
        $sort: { date: -1 }
      },
      {
        $group: {
          _id: '$userId',
          latestDate: { $first: '$date' },
          avgScore: { $avg: '$engagementScore' },
          dataCount: { $sum: 1 }
        }
      }
    ]);
    
    const metricsMap = new Map(
      latestMetrics.map(m => [m._id.toString(), m])
    );
    
    return users.map(user => {
      const metric = metricsMap.get(user._id.toString());
      const lastActiveDate = metric?.latestDate || null;
      const avgScore = Math.round(metric?.avgScore || 0);
      
      let status: 'active' | 'declining' | 'inactive' = 'inactive';
      if (lastActiveDate) {
        const daysSince = Math.ceil(
          (Date.now() - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 2) status = 'active';
        else if (daysSince <= 7) status = 'declining';
      }
      
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        lastActiveDate,
        status,
        avgEngagementScore: avgScore,
        totalDataPoints: metric?.dataCount || 0
      };
    });
  }

  /**
   * Get user overview with all dates that have data
   * Returns: user info + array of dates with engagement scores
   */
  async getUserOverview(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get all metrics for this user, sorted by date
    const allMetrics = await DailyEngagementMetrics.find({ userId })
      .sort({ date: -1 })
      .select('date engagementScore metricsCollected deviceType')
      .lean();
    
    // Get summary stats
    const totalDays = allMetrics.length;
    const avgScore = totalDays > 0
      ? Math.round(allMetrics.reduce((sum, m) => sum + m.engagementScore, 0) / totalDays)
      : 0;
    
    const lastActiveDate = allMetrics[0]?.date || null;
    const firstRecordDate = allMetrics[totalDays - 1]?.date || null;
    
    // Group by date for quick lookup
    const dateList = allMetrics.map(m => ({
      date: m.date,
      score: m.engagementScore,
      metrics: m.metricsCollected,
      deviceType: m.deviceType
    }));
    
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      stats: {
        totalDays,
        avgEngagementScore: avgScore,
        firstRecordDate,
        lastActiveDate
      },
      dates: dateList
    };
  }

  /**
   * Get detailed metrics for a specific user and date
   */
  async getUserDateMetrics(userId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const metric = await DailyEngagementMetrics.findOne({
      userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).lean();
    
    if (!metric) {
      return null;
    }
    
    return metric;
  }

  /**
   * Get metrics for date range (optimized with projection)
   */
  async getMetricsDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
    metricType?: string
  ) {
    const query: any = {
      userId,
      date: { $gte: startDate, $lte: endDate }
    };
    
    // Build projection based on what's needed
    let projection: any = {
      date: 1,
      engagementScore: 1,
      metricsCollected: 1,
      deviceType: 1
    };
    
    if (metricType) {
      projection[metricType] = 1;
    }
    
    const metrics = await DailyEngagementMetrics.find(query)
      .select(projection)
      .sort({ date: 1 })
      .lean();
    
    return metrics;
  }
}

export const engagementService = new EngagementService();
