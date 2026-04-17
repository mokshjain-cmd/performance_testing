import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import WorkoutReading from "../../models/WorkoutReading";
import { IParsedWorkout } from "../../parsers/workout";

/**
 * Benchmark workout metadata for comparison (calories, distance, steps)
 */
export interface IBenchmarkWorkoutMeta {
  activeCalories?: number;
  totalCalories?: number;
  distance?: number;  // in meters
  steps?: number;
}

/**
 * WorkoutAnalysisService
 * Computes session-level workout analysis metrics
 */
export class WorkoutAnalysisService {
  
  /**
   * Analyze a workout session
   * Called after workout readings have been ingested
   * 
   * @param sessionId - Session ID
   * @param parsedWorkout - Parsed workout data with summary stats from the log
   * @param benchmarkWorkoutMeta - Optional benchmark workout summary (calories, distance, etc.)
   */
  static async analyzeSession(
    sessionId: string,
    parsedWorkout: IParsedWorkout,
    benchmarkWorkoutMeta?: IBenchmarkWorkoutMeta
  ): Promise<void> {
    try {
      console.log(`[WorkoutAnalysisService] Analyzing session: ${sessionId}`);
      
      const sessionObjId = new Types.ObjectId(sessionId);
      
      // Fetch session
      const session = await Session.findById(sessionObjId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }
      
      if (session.metric !== 'Workout') {
        throw new Error(`Session ${sessionId} is not a Workout session`);
      }
      
      // Fetch Luna workout readings for this session
      const lunaReadings = await WorkoutReading.find({
        "meta.sessionId": sessionObjId,
        "meta.deviceType": "luna",
      }).sort({ timestamp: 1 });
      
      console.log(`[WorkoutAnalysisService] Found ${lunaReadings.length} Luna readings for session ${sessionId}`);
      
      // Compute stats from readings
      const computedHr = this.computeHrStats(lunaReadings);
      
      // Fetch benchmark readings if benchmark device exists
      let benchmarkComparison: any = undefined;
      const benchmarkDeviceType = session.benchmarkDeviceType;
      
      if (benchmarkDeviceType) {
        const benchmarkReadings = await WorkoutReading.find({
          "meta.sessionId": sessionObjId,
          "meta.deviceType": benchmarkDeviceType,
        }).sort({ timestamp: 1 });
        
        if (benchmarkReadings.length > 0) {
          console.log(`[WorkoutAnalysisService] Found ${benchmarkReadings.length} ${benchmarkDeviceType} readings`);
          benchmarkComparison = this.computeBenchmarkComparison(
            lunaReadings,
            benchmarkReadings,
            benchmarkDeviceType,
            {
              lunaCalories: parsedWorkout.summary.calories,
              lunaDistance: parsedWorkout.summary.distance,
              lunaSteps: parsedWorkout.summary.steps,
              benchmarkCalories: benchmarkWorkoutMeta?.activeCalories,
              benchmarkDistance: benchmarkWorkoutMeta?.distance,
              benchmarkSteps: benchmarkWorkoutMeta?.steps,
            }
          );
        }
      }
      
      // Build workoutStats from parsed workout summary + computed stats
      const workoutStats = {
        // From parsed workout summary
        sportType: parsedWorkout.sportType,
        workoutId: parsedWorkout.workoutId,
        startTime: parsedWorkout.startTime,
        endTime: parsedWorkout.endTime,
        durationSec: parsedWorkout.durationSec,
        
        hr: {
          avg: parsedWorkout.summary.avgHeart,
          max: parsedWorkout.summary.maxHeart,
          min: parsedWorkout.summary.minHeart,
        },
        
        hrZones: {
          warmUp: parsedWorkout.summary.heartWarmUp,
          fatBurning: parsedWorkout.summary.heartFatBurning,
          aerobic: parsedWorkout.summary.heartAerobic,
          anaerobic: parsedWorkout.summary.heartAnaerobic,
        },
        
        calories: parsedWorkout.summary.calories,
        steps: parsedWorkout.summary.steps,
        distance: parsedWorkout.summary.distance,
        
        pace: {
          avg: parsedWorkout.summary.avgPace,
          fast: parsedWorkout.summary.fastPace,
          slowest: parsedWorkout.summary.slowestPace,
        },
        
        speed: {
          avg: parsedWorkout.summary.avgSpeed,
          fast: parsedWorkout.summary.fastSpeed,
        },
        
        stepSpeed: {
          avg: parsedWorkout.summary.avgStepSpeed,
          max: parsedWorkout.summary.maxStepSpeed,
        },
        
        trainingEffect: parsedWorkout.summary.trainingEffect,
        trainingLoad: parsedWorkout.summary.trainingLoad,
        vo2max: parsedWorkout.summary.vo2max,
        recoveryTime: parsedWorkout.summary.recoveryTime,
        
        // Computed from ringPointData
        computedHr: computedHr,
        
        // Benchmark comparison (if available)
        benchmarkComparison: benchmarkComparison,
      };
      
      // Calculate luna accuracy percent if benchmark comparison exists
      let lunaAccuracyPercent: number | undefined;
      if (benchmarkComparison && benchmarkComparison.hrMape !== undefined) {
        lunaAccuracyPercent = Math.max(0, 100 - benchmarkComparison.hrMape);
      }
      
      // Save or update SessionAnalysis
      await SessionAnalysis.findOneAndUpdate(
        { sessionId: sessionObjId },
        {
          sessionId: sessionObjId,
          userId: session.userId,
          activityType: session.activityType,
          metric: session.metric,
          startTime: session.startTime,
          endTime: session.endTime,
          workoutStats,
          lunaAccuracyPercent,
          isValid: session.isValid,
          computedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      
      console.log(`[WorkoutAnalysisService] ✅ Session analysis completed for ${sessionId}`);
      
    } catch (error) {
      console.error(`[WorkoutAnalysisService] ❌ Error analyzing session ${sessionId}:`, error);
      throw error;
    }
  }
  
  /**
   * Compute HR statistics from workout readings
   */
  private static computeHrStats(readings: any[]): {
    avg: number;
    max: number;
    min: number;
    stdDev: number;
    readingCount: number;
  } | undefined {
    // Filter out readings with heartRate = 0 (invalid readings)
    const validReadings = readings.filter(r => r.heartRate > 0);
    
    if (validReadings.length === 0) {
      return undefined;
    }
    
    const hrValues = validReadings.map(r => r.heartRate);
    const avg = hrValues.reduce((sum, v) => sum + v, 0) / hrValues.length;
    const max = Math.max(...hrValues);
    const min = Math.min(...hrValues);
    
    // Calculate standard deviation
    const squaredDiffs = hrValues.map(v => Math.pow(v - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / hrValues.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    
    return {
      avg: Math.round(avg * 100) / 100,
      max,
      min,
      stdDev: Math.round(stdDev * 100) / 100,
      readingCount: validReadings.length,
    };
  }
  
  /**
   * Compute comparison metrics between Luna and benchmark readings
   * Also compares workout-level stats (calories, distance, steps) if provided
   */
  private static computeBenchmarkComparison(
    lunaReadings: any[],
    benchmarkReadings: any[],
    benchmarkDevice: string,
    workoutStats?: {
      lunaCalories?: number;
      lunaDistance?: number;
      lunaSteps?: number;
      benchmarkCalories?: number;
      benchmarkDistance?: number;
      benchmarkSteps?: number;
    }
  ): {
    benchmarkDevice: string;
    // Luna HR summary
    lunaHrAvg: number;
    lunaHrMax: number;
    lunaHrMin: number;
    // Benchmark HR summary
    benchmarkHrAvg: number;
    benchmarkHrMax: number;
    benchmarkHrMin: number;
    // HR comparison metrics
    hrMae: number;
    hrRmse: number;
    hrMape: number;
    hrPearsonR: number;
    hrMeanBias: number;
    overlapCount: number;
    overlapPercent: number;
    // Workout-level comparisons
    lunaCalories?: number;
    benchmarkCalories?: number;
    caloriesDifference?: number;
    caloriesBias?: number;
    caloriesAccuracyPercent?: number;
    lunaDistance?: number;
    benchmarkDistance?: number;
    distanceDifference?: number;
    distanceAccuracyPercent?: number;
    lunaSteps?: number;
    benchmarkSteps?: number;
    stepsDifference?: number;
    stepsAccuracyPercent?: number;
  } | undefined {
    
    // Create timestamp -> HR maps for alignment
    const lunaMap = new Map<number, number>();
    lunaReadings.forEach(r => {
      if (r.heartRate > 0) {
        const ts = Math.floor(r.timestamp.getTime() / 1000); // Round to seconds
        lunaMap.set(ts, r.heartRate);
      }
    });
    
    const benchmarkMap = new Map<number, number>();
    benchmarkReadings.forEach(r => {
      if (r.heartRate > 0) {
        const ts = Math.floor(r.timestamp.getTime() / 1000);
        benchmarkMap.set(ts, r.heartRate);
      }
    });
    
    // Find overlapping timestamps (within 1 second tolerance)
    const pairs: Array<{ luna: number; benchmark: number }> = [];
    
    for (const [lunaTs, lunaHr] of lunaMap) {
      // Try exact match first
      if (benchmarkMap.has(lunaTs)) {
        pairs.push({ luna: lunaHr, benchmark: benchmarkMap.get(lunaTs)! });
      } else if (benchmarkMap.has(lunaTs - 1)) {
        pairs.push({ luna: lunaHr, benchmark: benchmarkMap.get(lunaTs - 1)! });
      } else if (benchmarkMap.has(lunaTs + 1)) {
        pairs.push({ luna: lunaHr, benchmark: benchmarkMap.get(lunaTs + 1)! });
      }
    }
    
    if (pairs.length === 0) {
      console.warn(`[WorkoutAnalysisService] No overlapping readings found for comparison`);
      return undefined;
    }
    
    // Calculate Luna HR summary stats
    const lunaHrValues = Array.from(lunaMap.values());
    const lunaHrAvg = lunaHrValues.reduce((sum, v) => sum + v, 0) / lunaHrValues.length;
    const lunaHrMax = Math.max(...lunaHrValues);
    const lunaHrMin = Math.min(...lunaHrValues);
    
    // Calculate Benchmark HR summary stats
    const benchmarkHrValues = Array.from(benchmarkMap.values());
    const benchmarkHrAvg = benchmarkHrValues.reduce((sum, v) => sum + v, 0) / benchmarkHrValues.length;
    const benchmarkHrMax = Math.max(...benchmarkHrValues);
    const benchmarkHrMin = Math.min(...benchmarkHrValues);
    
    // Calculate metrics
    const n = pairs.length;
    const totalLunaReadings = Array.from(lunaMap.values()).length;
    
    // MAE - Mean Absolute Error
    const mae = pairs.reduce((sum, p) => sum + Math.abs(p.luna - p.benchmark), 0) / n;
    
    // RMSE - Root Mean Square Error
    const mse = pairs.reduce((sum, p) => sum + Math.pow(p.luna - p.benchmark, 2), 0) / n;
    const rmse = Math.sqrt(mse);
    
    // MAPE - Mean Absolute Percentage Error
    const mape = pairs.reduce((sum, p) => {
      if (p.benchmark === 0) return sum;
      return sum + Math.abs((p.luna - p.benchmark) / p.benchmark) * 100;
    }, 0) / n;
    
    // Mean Bias
    const meanBias = pairs.reduce((sum, p) => sum + (p.luna - p.benchmark), 0) / n;
    
    // Pearson R
    const lunaArr = pairs.map(p => p.luna);
    const benchArr = pairs.map(p => p.benchmark);
    const pearsonR = this.calculatePearsonR(lunaArr, benchArr);
    
    const overlapPercent = (n / totalLunaReadings) * 100;
    
    // Build result with HR comparison
    const result: any = {
      benchmarkDevice,
      // Luna HR summary
      lunaHrAvg: Math.round(lunaHrAvg * 100) / 100,
      lunaHrMax,
      lunaHrMin,
      // Benchmark HR summary
      benchmarkHrAvg: Math.round(benchmarkHrAvg * 100) / 100,
      benchmarkHrMax,
      benchmarkHrMin,
      // Comparison metrics
      hrMae: Math.round(mae * 100) / 100,
      hrRmse: Math.round(rmse * 100) / 100,
      hrMape: Math.round(mape * 100) / 100,
      hrPearsonR: Math.round(pearsonR * 1000) / 1000,
      hrMeanBias: Math.round(meanBias * 100) / 100,
      overlapCount: n,
      overlapPercent: Math.round(overlapPercent * 100) / 100,
    };
    
    // Add workout-level comparisons if data available
    if (workoutStats) {
      // Calories comparison
      if (workoutStats.lunaCalories !== undefined) {
        result.lunaCalories = workoutStats.lunaCalories;
      }
      if (workoutStats.benchmarkCalories !== undefined) {
        result.benchmarkCalories = workoutStats.benchmarkCalories;
      }
      if (workoutStats.lunaCalories !== undefined && workoutStats.benchmarkCalories !== undefined && workoutStats.benchmarkCalories > 0) {
        result.caloriesDifference = Math.round((workoutStats.lunaCalories - workoutStats.benchmarkCalories) * 100) / 100;
        result.caloriesBias = result.caloriesDifference;
        result.caloriesAccuracyPercent = Math.round(
          Math.max(0, 100 - Math.abs((workoutStats.lunaCalories - workoutStats.benchmarkCalories) / workoutStats.benchmarkCalories * 100)) * 100
        ) / 100;
      }
      
      // Distance comparison
      if (workoutStats.lunaDistance !== undefined) {
        result.lunaDistance = workoutStats.lunaDistance;
      }
      if (workoutStats.benchmarkDistance !== undefined) {
        result.benchmarkDistance = workoutStats.benchmarkDistance;
      }
      if (workoutStats.lunaDistance !== undefined && workoutStats.benchmarkDistance !== undefined && workoutStats.benchmarkDistance > 0) {
        result.distanceDifference = Math.round((workoutStats.lunaDistance - workoutStats.benchmarkDistance) * 100) / 100;
        result.distanceAccuracyPercent = Math.round(
          Math.max(0, 100 - Math.abs((workoutStats.lunaDistance - workoutStats.benchmarkDistance) / workoutStats.benchmarkDistance * 100)) * 100
        ) / 100;
      }
      
      // Steps comparison
      if (workoutStats.lunaSteps !== undefined) {
        result.lunaSteps = workoutStats.lunaSteps;
      }
      if (workoutStats.benchmarkSteps !== undefined) {
        result.benchmarkSteps = workoutStats.benchmarkSteps;
      }
      if (workoutStats.lunaSteps !== undefined && workoutStats.benchmarkSteps !== undefined && workoutStats.benchmarkSteps > 0) {
        result.stepsDifference = Math.round(workoutStats.lunaSteps - workoutStats.benchmarkSteps);
        result.stepsAccuracyPercent = Math.round(
          Math.max(0, 100 - Math.abs((workoutStats.lunaSteps - workoutStats.benchmarkSteps) / workoutStats.benchmarkSteps * 100)) * 100
        ) / 100;
      }
    }
    
    return result;
  }
  
  /**
   * Calculate Pearson correlation coefficient
   */
  private static calculatePearsonR(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }
}
