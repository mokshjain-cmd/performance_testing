import { Types } from "mongoose";
import Session from "../../models/Session";
import WorkoutReading from "../../models/WorkoutReading";
import Device from "../../models/Devices";
import User from "../../models/Users";
import { LunaWorkoutParser, IParsedWorkout } from "../../parsers/workout";
import { WorkoutAnalysisService, IBenchmarkWorkoutMeta } from "./WorkoutAnalysisService";
import { AppleHealthWorkoutParser, IAppleWorkout } from "../../parsers/workout/AppleHealthWorkoutParser";
import { PolarWorkoutParser, IPolarWorkout } from "../../parsers/workout/PolarWorkoutParser";
import { CorosWorkoutParser, ICorosWorkout } from "../../parsers/workout/CorosWorkoutParser";
//import { WhoopWorkoutParser, IWhoopWorkout } from "../../parsers/workout/WhoopWorkoutParser";
import { extractHRForWorkoutComparison } from "../../parsers/appleHRparser";
import { extractAppleHealthZip, extractLunaZip, deleteDirectory } from "../../tools/zipExtractor";
import { mailService } from "../mail.service";
import { updateUserAccuracySummary } from "../userAccuracySummary.service";
import { updateFirmwarePerformanceForLuna } from "../firmwarePerformance.service";
import { updateBenchmarkComparisonSummariesForSession } from "../benchmarkComparisonSummary.service";
import { updateAdminGlobalSummary } from "../adminGlobalSummary.service";
import { updateAdminDailyTrend } from "../adminDailyTrend.service";
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

export interface IWorkoutIngestionResult {
  sessionsCreated: number;
  sessionIds: string[];
  workouts: Array<{
    sessionId: string;
    sportType: number;
    startTime: Date;
    endTime: Date;
    durationSec: number;
  }>;
  status: 'processing' | 'completed' | 'failed';
  message?: string;
}

interface IWorkoutSessionInfo {
  sessionId: Types.ObjectId;
  workout: IParsedWorkout;
}

/**
 * IngestWorkoutService
 * Handles parsing workout data from app logs and creating workout sessions
 * 
 * Uses async pattern: creates sessions quickly, processes in background
 */
export class IngestWorkoutService {
  
  /**
   * Main entry point: Ingest workout day data (SYNC - waits for full processing)
   * 
   * Phase 1: Parse Luna log, create session records
   * Phase 2: Process readings, benchmark data, run analysis (all awaited before returning)
   * 
   * @param userId - User ID
   * @param workoutDate - Target date to extract workouts for
   * @param firmwareVersion - Firmware version for Luna device
   * @param lunaFile - Luna app log file
   * @param benchmarkFile - Optional benchmark device file (Apple Health, etc.)
   * @param benchmarkDeviceType - Type of benchmark device
   * @param mobileType - Android/iOS
   */
  static async ingestWorkoutDay(
    userId: Types.ObjectId | string,
    workoutDate: Date,
    firmwareVersion: string,
    lunaFile: Express.Multer.File,
    benchmarkFile?: Express.Multer.File,
    benchmarkDeviceType?: string,
    mobileType?: string
  ): Promise<IWorkoutIngestionResult> {
    console.log('\n🏋️🏋️🏋️ ============================================');
    console.log('🏋️ WORKOUT INGESTION SERVICE (SYNC MODE)');
    console.log('🏋️🏋️🏋️ ============================================');
    console.log('📊 Received Parameters:');
    console.log('   - userId:', userId);
    console.log('   - workoutDate:', workoutDate.toISOString().split('T')[0]);
    console.log('   - firmwareVersion:', firmwareVersion);
    console.log('   - mobileType:', mobileType);
    console.log('   - benchmarkDeviceType:', benchmarkDeviceType);
    console.log('   - lunaFile:', lunaFile?.filename);
    console.log('   - benchmarkFile:', benchmarkFile?.filename);
    console.log('🏋️🏋️🏋️ ============================================\n');
    
    const result: IWorkoutIngestionResult = {
      sessionsCreated: 0,
      sessionIds: [],
      workouts: [],
      status: 'completed',
      message: 'Workout sessions created and fully processed.',
    };
    
    // Get Luna device
    const lunaDevice = await Device.findOne({ deviceType: 'luna', firmwareVersion });
    if (!lunaDevice) {
      throw new Error(`Luna device with firmware ${firmwareVersion} not found. Register the device first.`);
    }
    
    // Handle ZIP file extraction for Luna
    let lunaFilePath = lunaFile.path;
    let extractedFolder: string | undefined;
    
    if (lunaFile.path.toLowerCase().endsWith('.zip')) {
      console.log('[IngestWorkoutService] 📦 Luna ZIP file detected, extracting...');
      const extracted = await extractLunaZip(lunaFile.path);
      lunaFilePath = extracted.logFilePath;
      extractedFolder = extracted.extractedFolder;
      console.log(`[IngestWorkoutService] ✅ Extracted Luna log file: ${lunaFilePath}`);
    }
    
    // Parse workouts from Luna log (quick operation)
    console.log(`[IngestWorkoutService] Parsing Luna log for workouts on ${workoutDate.toISOString().split('T')[0]}`);
    const parsedWorkouts = await LunaWorkoutParser.parseWorkoutsFromLog(
      lunaFilePath,
      workoutDate
    );
    
    // Log each Luna workout found with start/end times
    console.log(`[IngestWorkoutService] Found ${parsedWorkouts.length} Luna workouts`);
    parsedWorkouts.forEach((workout, idx) => {
      console.log(`[IngestWorkoutService]   Luna Workout #${idx + 1}: ${workout.workoutId}, sportType: ${workout.sportType}, ` +
        `startTime: ${workout.startTime.toISOString()}, endTime: ${workout.endTime.toISOString()}, ` +
        `duration: ${workout.durationSec}s (${(workout.durationSec / 60).toFixed(1)}min)`);
    });
    
    if (parsedWorkouts.length === 0) {
      console.log(`[IngestWorkoutService] No workouts found for ${workoutDate.toISOString().split('T')[0]}`);
      result.status = 'completed';
      result.message = 'No workouts found for this date';
      
      // Clean up files immediately
      this.cleanupFiles(lunaFile, benchmarkFile, extractedFolder);
      
      return result;
    }
    
    console.log(`[IngestWorkoutService] Found ${parsedWorkouts.length} workouts to process`);
    
    // PHASE 1: Create sessions quickly (sync) - NO readings yet
    const sessionInfos: IWorkoutSessionInfo[] = [];
    
    for (const workout of parsedWorkouts) {
      try {
        const sessionId = await this.createWorkoutSessionOnly(
          userId,
          workout,
          firmwareVersion,
          lunaDevice._id,
          benchmarkDeviceType
        );
        
        sessionInfos.push({ sessionId, workout });
        
        result.sessionIds.push(sessionId.toString());
        result.sessionsCreated++;
        result.workouts.push({
          sessionId: sessionId.toString(),
          sportType: workout.sportType,
          startTime: workout.startTime,
          endTime: workout.endTime,
          durationSec: workout.durationSec,
        });
        
        console.log(`[IngestWorkoutService] Created session ${sessionId} for workout ${workout.workoutId}`);
        
      } catch (err) {
        console.error(`[IngestWorkoutService] Error creating session for workout ${workout.workoutId}:`, err);
      }
    }
    
    // PHASE 2: Process readings, benchmark, analysis (sync - wait for completion)
    await this.processWorkoutSessionsAsync(
      userId,
      workoutDate,
      firmwareVersion,
      lunaFile,
      lunaFilePath,
      benchmarkFile,
      benchmarkDeviceType,
      sessionInfos,
      parsedWorkouts,
      extractedFolder
    );
    
    console.log(`[IngestWorkoutService] Completed processing ${result.sessionsCreated} workout sessions`);
    
    return result;
  }
  
  /**
   * Create a workout session WITHOUT inserting readings (for fast sync response)
   */
  private static async createWorkoutSessionOnly(
    userId: Types.ObjectId | string,
    workout: IParsedWorkout,
    firmwareVersion: string,
    lunaDeviceId: Types.ObjectId,
    benchmarkDeviceType?: string
  ): Promise<Types.ObjectId> {
    
    // Format session name as DD-MM-YY | HH:MM:SS from workout start time
    const day = String(workout.startTime.getUTCDate()).padStart(2, '0');
    const month = String(workout.startTime.getUTCMonth() + 1).padStart(2, '0');
    const year = String(workout.startTime.getUTCFullYear()).slice(-2);
    const hours = String(workout.startTime.getUTCHours()).padStart(2, '0');
    const minutes = String(workout.startTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(workout.startTime.getUTCSeconds()).padStart(2, '0');
    const sessionName = `${day}-${month}-${year} | ${hours}:${minutes}:${seconds}`;
    
    // Create session document (no readings yet)
    const session = await Session.create({
      userId,
      name: sessionName,
      activityType: 'daily',
      metric: 'Workout',
      startTime: workout.startTime,
      endTime: workout.endTime,
      durationSec: workout.durationSec,
      devices: [{
        deviceId: lunaDeviceId,
        deviceType: 'luna',
        firmwareVersion: firmwareVersion,
      }],
      benchmarkDeviceType: benchmarkDeviceType || null,
      bandPosition: 'wrist',
      isValid: true,
    });
    
    return session._id;
  }
  
  /**
   * Process workout sessions asynchronously (background)
   * - Insert Luna readings
   * - Parse and insert benchmark data
   * - Run analysis
   * - Update summaries
   * - Send email notification
   */
  private static async processWorkoutSessionsAsync(
    userId: Types.ObjectId | string,
    workoutDate: Date,
    firmwareVersion: string,
    lunaFile: Express.Multer.File,
    lunaFilePath: string,
    benchmarkFile: Express.Multer.File | undefined,
    benchmarkDeviceType: string | undefined,
    sessionInfos: IWorkoutSessionInfo[],
    parsedWorkouts: IParsedWorkout[],
    extractedFolderFromZip?: string
  ): Promise<void> {
    console.log(`[IngestWorkoutService] 🔄 Starting background processing for ${sessionInfos.length} sessions...`);
    
    let userEmail: string | undefined;
    let userName: string | undefined;
    let extractedFolder: string | undefined = extractedFolderFromZip;
    const metric = 'Workout';
    
    try {
      // Fetch user details for email notification
      const user = await User.findById(userId);
      if (user) {
        userEmail = user.email;
        userName = user.name;
      }
      
      // Parse benchmark file if provided
      let appleWorkouts: IAppleWorkout[] = [];
      let polarWorkout: IPolarWorkout | null = null;
      let corosWorkout: ICorosWorkout | null = null;
      //let whoopWorkouts: IWhoopWorkout[] = [];
      let benchmarkFilePath: string | undefined;
      
      // Handle Apple Health benchmark file
      const isAppleBasedDevice = ['apple', 'whoop', 'zepp', 'garmin'].includes(benchmarkDeviceType || '');
      if (benchmarkFile && isAppleBasedDevice) {
        console.log(`[IngestWorkoutService] 🍎 Parsing Apple Health benchmark file...`);
        
        const fileExtension = path.extname(benchmarkFile.path).toLowerCase();
        if (fileExtension === '.zip') {
          try {
            const extracted = await extractAppleHealthZip(benchmarkFile.path);
            benchmarkFilePath = extracted.exportXmlPath;
            extractedFolder = extracted.extractedFolder;
          } catch (zipError) {
            console.error('[IngestWorkoutService] ❌ Error extracting Apple Health ZIP:', zipError);
          }
        } else {
          benchmarkFilePath = benchmarkFile.path;
        }
        
        if (benchmarkFilePath) {
          // Add 15 minute buffer on each side (devices are well synchronized, typically <1 min drift)
          const minStartTime = new Date(Math.min(...parsedWorkouts.map(w => w.startTime.getTime())) - 900000);
          const maxEndTime = new Date(Math.max(...parsedWorkouts.map(w => w.endTime.getTime())) + 900000);
          
          console.log(`[IngestWorkoutService] Apple filter window: ${minStartTime.toISOString()} to ${maxEndTime.toISOString()}`);
          
          appleWorkouts = await AppleHealthWorkoutParser.parseWorkouts(
            benchmarkFilePath,
            minStartTime,
            maxEndTime,
            benchmarkDeviceType
          );
          console.log(`[IngestWorkoutService] Found ${appleWorkouts.length} Apple workouts in time range`);
          
          // Log each Apple workout with start/end times
          appleWorkouts.forEach((workout, idx) => {
            const duration = workout.durationMin ? workout.durationMin.toFixed(1) : workout.durationSec ? (workout.durationSec / 60).toFixed(1) : 'N/A';
            console.log(`[IngestWorkoutService]   Apple Workout #${idx + 1}: ${workout.workoutActivityType}, ` +
              `startTime: ${workout.startTime.toISOString()}, endTime: ${workout.endTime.toISOString()}, ` +
              `duration: ${duration}min`);
          });
        }
      }
      
      // Handle Polar benchmark file
      if (benchmarkFile && benchmarkDeviceType === 'polar') {
        console.log(`[IngestWorkoutService] 🏃 Parsing Polar workout CSV file...`);
        benchmarkFilePath = benchmarkFile.path;
        
        try {
          polarWorkout = await PolarWorkoutParser.parseWorkout(benchmarkFilePath);
          if (polarWorkout) {
            console.log(`[IngestWorkoutService] 🏃 Polar workout parsed: ${polarWorkout.hrReadings.length} HR readings`);
          }
        } catch (polarError) {
          console.error('[IngestWorkoutService] ❌ Error parsing Polar CSV:', polarError);
        }
      }
      
      // Handle Coros benchmark file (.fit format)
      if (benchmarkFile && benchmarkDeviceType === 'coros') {
        console.log(`[IngestWorkoutService] ⌚ Parsing Coros workout FIT file...`);
        benchmarkFilePath = benchmarkFile.path;
        
        try {
          corosWorkout = await CorosWorkoutParser.parseWorkout(benchmarkFilePath);
          if (corosWorkout) {
            console.log(`[IngestWorkoutService] ⌚ Coros workout parsed: ${corosWorkout.hrReadings.length} HR readings`);
          }
        } catch (corosError) {
          console.error('[IngestWorkoutService] ❌ Error parsing Coros FIT:', corosError);
        }
      }
      
      // Handle Whoop benchmark file (from Apple Health export, filtered by sourceName)
      
      
      // Process each session
      for (const { sessionId, workout } of sessionInfos) {
        try {
          // Insert Luna workout readings
          await this.insertWorkoutReadings(sessionId, userId, workout, firmwareVersion);
          
          // Find matching benchmark workout
          let benchmarkWorkoutMeta: IBenchmarkWorkoutMeta | undefined;
          
          // Match Apple workout
          if (appleWorkouts.length > 0 && isAppleBasedDevice && benchmarkFilePath) {
            console.log(`[IngestWorkoutService] Matching Luna workout: ${workout.startTime.toISOString()} - ${workout.endTime.toISOString()}`);
            
            const match = AppleHealthWorkoutParser.findMatchingWorkout(
              appleWorkouts,
              workout.startTime,
              workout.endTime,
              50
            );
            
            if (match) {
              const timeDiff = (match.workout.startTime.getTime() - workout.startTime.getTime()) / 60000;
              console.log(`[IngestWorkoutService] ✅ Matched Apple workout: ${match.workout.startTime.toISOString()} - ${match.workout.endTime.toISOString()}`);
              console.log(`[IngestWorkoutService]    Overlap: ${match.overlapPercent.toFixed(1)}%, Time diff: ${timeDiff.toFixed(1)} minutes`);
              console.log(`[IngestWorkoutService]    Apple stats - Calories: ${match.workout.activeCalories || 'N/A'}, Distance: ${match.workout.distance ? (match.workout.distance/1000).toFixed(2) + 'km' : 'N/A'}, Steps: ${match.workout.steps || 'N/A'}`);
              console.log(`[IngestWorkoutService]    Luna stats  - Calories: ${workout.summary.calories}, Distance: ${(workout.summary.distance/1000).toFixed(2)}km, Steps: ${workout.summary.steps}`);
              
              benchmarkWorkoutMeta = {
                activeCalories: match.workout.activeCalories,
                totalCalories: match.workout.totalCalories,
                distance: match.workout.distance,
                steps: match.workout.steps,
              };
              
              // Process Apple HR data
              await this.processBenchmarkHR(
                sessionId,
                userId,
                workout,
                benchmarkFilePath,
                benchmarkDeviceType || 'apple'
              );
            } else {
              console.log(`[IngestWorkoutService] ❌ No matching Apple workout found for Luna workout at ${workout.startTime.toISOString()}`);
            }
          }
          
          // Match Polar workout
          if (polarWorkout && benchmarkDeviceType === 'polar') {
            const overlap = PolarWorkoutParser.findWorkoutOverlap(
              polarWorkout,
              workout.startTime,
              workout.endTime,
              50
            );
            
            if (overlap?.isMatch) {
              benchmarkWorkoutMeta = {
                activeCalories: polarWorkout.calories,
                distance: polarWorkout.totalDistanceKm ? polarWorkout.totalDistanceKm * 1000 : undefined,
              };
              
              // Process Polar HR data
              await this.processPolarBenchmarkHR(
                sessionId,
                userId,
                workout,
                polarWorkout
              );
              
              console.log(`[IngestWorkoutService] 🏃 Matched Polar workout: ${overlap.overlapPercent.toFixed(1)}% overlap`);
            }
          }
          
          // Match Coros workout
          if (corosWorkout && benchmarkDeviceType === 'coros') {
            const overlap = CorosWorkoutParser.findWorkoutOverlap(
              corosWorkout,
              workout.startTime,
              workout.endTime,
              50
            );
            
            if (overlap?.isMatch) {
              benchmarkWorkoutMeta = {
                // Coros doesn't provide calories or steps, only distance
                distance: corosWorkout.totalDistanceKm ? corosWorkout.totalDistanceKm * 1000 : undefined,
              };
              
              // Process Coros HR data
              await this.processCorosBenchmarkHR(
                sessionId,
                userId,
                workout,
                corosWorkout
              );
              
              console.log(`[IngestWorkoutService] ⌚ Matched Coros workout: ${overlap.overlapPercent.toFixed(1)}% overlap`);
            }
          }
          
          // Match Whoop workout (same pattern as Apple)
        
          
          // Run analysis
          await WorkoutAnalysisService.analyzeSession(sessionId.toString(), workout, benchmarkWorkoutMeta);
          
          // Update summaries
          await this.updateSummaries(sessionId.toString(), userId.toString(), firmwareVersion, workout.startTime);
          
          console.log(`[IngestWorkoutService] ✅ Completed processing for session ${sessionId}`);
          
        } catch (sessionError) {
          console.error(`[IngestWorkoutService] Error processing session ${sessionId}:`, sessionError);
        }
      }
      
      // Send success email
      if (sessionInfos.length > 0 && userEmail && userName) {
        await mailService.sendSessionAnalysisNotification(
          userEmail,
          userName,
          sessionInfos[0].sessionId.toString(),
          `Workout Day - ${workoutDate.toISOString().split('T')[0]}`,
          'success',
          metric
        );
      }
      
      console.log(`[IngestWorkoutService] ✅ Background processing complete for ${sessionInfos.length} sessions`);
      
    } catch (error) {
      console.error('[IngestWorkoutService] ❌ Error in background processing:', error);
      
      // Send failure email
      if (userEmail && userName) {
        await mailService.sendSessionAnalysisNotification(
          userEmail,
          userName,
          'N/A',
          `Workout Day - ${workoutDate.toISOString().split('T')[0]}`,
          'failed',
          metric,
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
      }
      
    } finally {
      // Clean up temp files
      await this.cleanupFiles(lunaFile, benchmarkFile, extractedFolder);
    }
  }
  
  /**
   * Insert workout readings for a session
   */
  private static async insertWorkoutReadings(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId | string,
    workout: IParsedWorkout,
    firmwareVersion: string
  ): Promise<void> {
    if (workout.readings && workout.readings.length > 0) {
      const readings = workout.readings.map(reading => ({
        meta: {
          sessionId: sessionId,
          workoutId: workout.workoutId,
          userId: new Types.ObjectId(userId.toString()),
          deviceType: 'luna',
          firmwareVersion: firmwareVersion,
        },
        timestamp: reading.timestamp,
        heartRate: reading.heartRate,
        heartRateConfidence: reading.heartRateConfidence,
        exerciseIntensity: reading.exerciseIntensity,
        isValid: true,
      }));
      
      await WorkoutReading.insertMany(readings);
      console.log(`[IngestWorkoutService] Inserted ${readings.length} workout readings for session ${sessionId}`);
    } else {
      console.warn(`[IngestWorkoutService] No ringPointData readings for workout ${workout.workoutId}`);
    }
  }
  
  /**
   * Clean up temp files and extracted folders
   */
  private static async cleanupFiles(
    lunaFile?: Express.Multer.File,
    benchmarkFile?: Express.Multer.File,
    extractedFolder?: string
  ): Promise<void> {
    try {
      if (lunaFile?.path) {
        await unlinkAsync(lunaFile.path);
        console.log(`✅ Deleted temp file: ${lunaFile.filename}`);
      }
      if (benchmarkFile?.path) {
        await unlinkAsync(benchmarkFile.path);
        console.log(`✅ Deleted temp file: ${benchmarkFile.filename}`);
      }
      if (extractedFolder) {
        await deleteDirectory(extractedFolder);
        console.log(`✅ Deleted extracted folder: ${extractedFolder}`);
      }
    } catch (deleteError) {
      console.warn('⚠️ Error deleting temp files:', deleteError);
    }
  }
  
  /**
   * Update all summary collections after session analysis
   */
  private static async updateSummaries(
    sessionId: string,
    userId: string,
    firmwareVersion: string,
    sessionStartTime: Date
  ): Promise<void> {
    try {
      console.log(`[IngestWorkoutService] Updating summaries for session ${sessionId}`);
      
      // Update user accuracy summary
      await updateUserAccuracySummary(userId, 'Workout');
      
      // Update firmware performance
      await updateFirmwarePerformanceForLuna(firmwareVersion, 'Workout');
      
      // Update benchmark comparison summaries
      await updateBenchmarkComparisonSummariesForSession(sessionId);
      
      // Update admin global summary
      await updateAdminGlobalSummary('Workout', true);
      
      // Update admin daily trend
      await updateAdminDailyTrend(sessionStartTime, 'Workout', true);
      
      console.log(`[IngestWorkoutService] Summaries updated for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[IngestWorkoutService] Error updating summaries for session ${sessionId}:`, error);
      // Don't throw - summaries can be recalculated later
    }
  }
  
  /**
   * Process benchmark HR data for a workout session
   * Extracts HR readings from Apple Health for the workout time window
   */
  private static async processBenchmarkHR(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId | string,
    workout: IParsedWorkout,
    benchmarkFilePath: string,
    benchmarkDeviceType: string
  ): Promise<void> {
    try {
      console.log(`[IngestWorkoutService] Extracting ${benchmarkDeviceType} HR for workout ${workout.workoutId}`);
      
      let hrReadings: Array<{ timestamp: Date; heartRate: number }> = [];
      const isAppleBasedDevice = ['apple', 'whoop', 'zepp', 'garmin'].includes(benchmarkDeviceType || '');
      if (isAppleBasedDevice) {
        hrReadings = await extractHRForWorkoutComparison(
          benchmarkFilePath,
          workout.startTime,
          workout.endTime,
          benchmarkDeviceType
        );
      }
      // Add other benchmark device types here as needed
      
      if (hrReadings.length === 0) {
        console.log(`[IngestWorkoutService] No benchmark HR readings found in workout time range`);
        return;
      }
      
      console.log(`[IngestWorkoutService] Extracted ${hrReadings.length} ${benchmarkDeviceType} HR readings`);
      
      // Insert benchmark readings
      const benchmarkReadings = hrReadings.map(reading => ({
        meta: {
          sessionId: sessionId,
          workoutId: workout.workoutId,
          userId: new Types.ObjectId(userId.toString()),
          deviceType: benchmarkDeviceType,
          firmwareVersion: undefined,
        },
        timestamp: reading.timestamp,
        heartRate: reading.heartRate,
        heartRateConfidence: 100, // Apple Watch typically has high confidence
        exerciseIntensity: 0,
        isValid: true,
      }));
      
      await WorkoutReading.insertMany(benchmarkReadings);
      console.log(`[IngestWorkoutService] Inserted ${benchmarkReadings.length} benchmark readings for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[IngestWorkoutService] Error processing benchmark HR:`, error);
      // Don't throw - we still want the session to be created even without benchmark
    }
  }
  
  /**
   * Process Polar HR data for a workout session
   * Uses pre-parsed Polar workout data (already in memory from CSV parsing)
   */
  private static async processPolarBenchmarkHR(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId | string,
    workout: IParsedWorkout,
    polarWorkout: IPolarWorkout
  ): Promise<void> {
    try {
      console.log(`[IngestWorkoutService] 🏃 Processing Polar HR for workout ${workout.workoutId}`);
      
      // Extract Polar HR readings within the Luna workout time window
      const hrReadings = PolarWorkoutParser.extractHRInTimeWindow(
        polarWorkout,
        workout.startTime,
        workout.endTime
      );
      
      if (hrReadings.length === 0) {
        console.log(`[IngestWorkoutService] No Polar HR readings found in workout time range`);
        return;
      }
      
      console.log(`[IngestWorkoutService] 🏃 Found ${hrReadings.length} Polar HR readings in workout window`);
      
      // Insert benchmark readings
      const benchmarkReadings = hrReadings.map(reading => ({
        meta: {
          sessionId: sessionId,
          workoutId: workout.workoutId,
          userId: new Types.ObjectId(userId.toString()),
          deviceType: 'polar',
          firmwareVersion: undefined,
        },
        timestamp: reading.timestamp,
        heartRate: reading.heartRate,
        heartRateConfidence: 100, // Polar chest strap has high confidence
        exerciseIntensity: 0,
        isValid: true,
      }));
      
      await WorkoutReading.insertMany(benchmarkReadings);
      console.log(`[IngestWorkoutService] 🏃 Inserted ${benchmarkReadings.length} Polar readings for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[IngestWorkoutService] ❌ Error processing Polar HR:`, error);
      // Don't throw - we still want the session to be created even without benchmark
    }
  }
  
  /**
   * Process Coros HR data for a workout session
   * Uses pre-parsed Coros workout data (already in memory from FIT parsing)
   */
  private static async processCorosBenchmarkHR(
    sessionId: Types.ObjectId,
    userId: Types.ObjectId | string,
    workout: IParsedWorkout,
    corosWorkout: ICorosWorkout
  ): Promise<void> {
    try {
      console.log(`[IngestWorkoutService] ⌚ Processing Coros HR for workout ${workout.workoutId}`);
      
      // Extract Coros HR readings within the Luna workout time window
      const hrReadings = CorosWorkoutParser.extractHRInTimeWindow(
        corosWorkout,
        workout.startTime,
        workout.endTime
      );
      
      if (hrReadings.length === 0) {
        console.log(`[IngestWorkoutService] No Coros HR readings found in workout time range`);
        return;
      }
      
      console.log(`[IngestWorkoutService] ⌚ Found ${hrReadings.length} Coros HR readings in workout window`);
      
      // Insert benchmark readings
      const benchmarkReadings = hrReadings.map(reading => ({
        meta: {
          sessionId: sessionId,
          workoutId: workout.workoutId,
          userId: new Types.ObjectId(userId.toString()),
          deviceType: 'coros',
          firmwareVersion: undefined,
        },
        timestamp: reading.timestamp,
        heartRate: reading.heartRate,
        heartRateConfidence: 95, // Coros optical HR has good confidence
        exerciseIntensity: 0,
        isValid: true,
      }));
      
      await WorkoutReading.insertMany(benchmarkReadings);
      console.log(`[IngestWorkoutService] ⌚ Inserted ${benchmarkReadings.length} Coros readings for session ${sessionId}`);
      
    } catch (error) {
      console.error(`[IngestWorkoutService] ❌ Error processing Coros HR:`, error);
      // Don't throw - we still want the session to be created even without benchmark
    }
  }
  
  
}
 