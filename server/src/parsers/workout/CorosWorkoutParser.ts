import * as fs from 'fs';
import FitParser from 'fit-file-parser';

/**
 * Parsed workout from Coros FIT file export
 * Interface matches IPolarWorkout for seamless integration
 */
export interface ICorosWorkout {
  // Summary
  name: string;
  sport: string;
  sportType: number;           // Mapped Luna sport type
  date: string;                // YYYY-MM-DD
  startTimeStr: string;        // HH:MM:SS
  startTime: Date;
  endTime: Date;
  durationSec: number;
  
  // Summary stats (computed from readings)
  avgHeartRate?: number;
  maxHeartRate?: number;
  totalDistanceKm?: number;    // km - from last reading's distance
  avgSpeedKmh?: number;        // km/h
  maxSpeedKmh?: number;        // km/h
  
  // User info (may not be available in FIT)
  heightCm?: number;
  weightKg?: number;
  
  // Per-second HR readings
  hrReadings: Array<{
    timestamp: Date;
    heartRate: number;
    speed?: number;
    cadence?: number;
    altitude?: number;
    temperature?: number;
    power?: number;
    distance?: number;         // Cumulative distance in meters
    latitude?: number;
    longitude?: number;
  }>;
}

/**
 * FIT file sport types to Luna sport type mapping
 * FIT sport enum: https://developer.garmin.com/fit/cookbook/sport-types/
 * Luna sport types:
 * 1=Running, 2=Cycling, 3=IndoorCycling, 4=Swimming, 5=OpenWaterSwim,
 * 6=Hiking, 7=Yoga, 8=Elliptical, 9=Walking, 16=StrengthTraining,
 * 17=CoreTraining, 18=HIIT, 19=Badminton, 20=Tennis, 21=TableTennis,
 * 22=Basketball, 23=Soccer, 24=Dance, 25=MindAndBody, 0=Other
 */
const FIT_TO_LUNA_SPORT_TYPE: Record<string, number> = {
  // Running variants
  'running': 1,
  'trail_running': 6,
  'treadmill_running': 1,
  // Walking
  'walking': 9,
  'hiking': 6,
  // Cycling
  'cycling': 2,
  'road_cycling': 2,
  'mountain_biking': 2,
  'indoor_cycling': 3,
  'spinning': 3,
  // Swimming
  'swimming': 4,
  'lap_swimming': 4,
  'pool_swimming': 4,
  'open_water_swimming': 5,
  // Gym
  'strength_training': 16,
  'weight_training': 16,
  'fitness_equipment': 16,
  'cardio_training': 18,
  'hiit': 18,
  'elliptical': 8,
  'stair_climbing': 8,
  // Sports
  'tennis': 20,
  'badminton': 19,
  'table_tennis': 21,
  'basketball': 22,
  'soccer': 23,
  'football': 23,
  // Mind & body
  'yoga': 7,
  'pilates': 7,
  'meditation': 25,
  // Generic
  'generic': 0,
  'training': 0,
  'all': 0,
};

/**
 * Coros Workout Parser
 * Parses Coros .FIT file exports
 * 
 * NOTE: Coros FIT timestamps are in UTC
 * We apply IST offset (+5:30) to match Luna's approach
 */
export class CorosWorkoutParser {
  
  /**
   * Parse a Coros FIT file
   * @param filePath Path to the Coros .fit file
   * @returns Parsed Coros workout or null if invalid
   */
  static async parseWorkout(filePath: string): Promise<ICorosWorkout | null> {
    console.log(`[CorosWorkoutParser] Parsing file: ${filePath}`);
    
    return new Promise((resolve, reject) => {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        
        const fitParser = new FitParser({
          force: true,
          speedUnit: 'km/h',
          lengthUnit: 'km',
          temperatureUnit: 'celsius',
          elapsedRecordField: true,
          mode: 'cascade',
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fitParser.parse(fileBuffer, (error: string | undefined, data: any) => {
          if (error) {
            console.error(`[CorosWorkoutParser] ❌ Error parsing FIT file:`, error);
            resolve(null);
            return;
          }
          
          if (!data) {
            console.error(`[CorosWorkoutParser] ❌ No data returned from FIT parser`);
            resolve(null);
            return;
          }
          
          try {
            const workout = this.extractWorkoutData(data);
            if (workout) {
              console.log(`[CorosWorkoutParser] ✅ Parsed workout successfully:`);
              console.log(`   - Sport: ${workout.sport} (type: ${workout.sportType})`);
              console.log(`   - Start: ${workout.startTime?.toISOString()}`);
              console.log(`   - Duration: ${workout.durationSec}s`);
              console.log(`   - HR readings: ${workout.hrReadings.length}`);
              console.log(`   - Avg HR: ${workout.avgHeartRate}, Max HR: ${workout.maxHeartRate}`);
              console.log(`   - Distance: ${workout.totalDistanceKm?.toFixed(2)} km`);
            }
            resolve(workout);
          } catch (extractError) {
            console.error(`[CorosWorkoutParser] ❌ Error extracting workout data:`, extractError);
            resolve(null);
          }
        });
      } catch (readError) {
        console.error(`[CorosWorkoutParser] ❌ Error reading file:`, readError);
        resolve(null);
      }
    });
  }
  
  /**
   * Extract workout data from parsed FIT data
   */
  private static extractWorkoutData(data: FitData): ICorosWorkout | null {
    // Get session info
    const sessions = data.sessions || [];
    const session = sessions[0];
    
    if (!session) {
      console.warn(`[CorosWorkoutParser] ⚠️ No session found in FIT file`);
      return null;
    }
    
    // Get records (per-second data)
    const records = data.records || [];
    
    if (records.length === 0) {
      console.warn(`[CorosWorkoutParser] ⚠️ No records found in FIT file`);
      return null;
    }
    
    // Extract start time from session or first record
    const startTimeRaw = session.start_time || session.timestamp || records[0]?.timestamp;
    if (!startTimeRaw) {
      console.warn(`[CorosWorkoutParser] ⚠️ No start time found in FIT file`);
      return null;
    }
    
    // FIT timestamps are in UTC, apply IST offset (+5:30) to match Luna
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const startTime = new Date(new Date(startTimeRaw).getTime() + IST_OFFSET_MS);
    
    // Get sport type
    const sportName = (session.sport || 'generic').toLowerCase();
    const sportType = FIT_TO_LUNA_SPORT_TYPE[sportName] ?? 0;
    
    // Parse HR readings from records
    const hrReadings: ICorosWorkout['hrReadings'] = [];
    let maxHR = 0;
    let totalHR = 0;
    let hrCount = 0;
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;
    let lastDistance = 0;
    
    for (const record of records) {
      if (!record.timestamp) continue;
      
      // Apply IST offset to record timestamp
      const timestamp = new Date(new Date(record.timestamp).getTime() + IST_OFFSET_MS);
      const heartRate = record.heart_rate || 0;
      const speed = record.speed || record.enhanced_speed || 0;
      const distance = record.distance || 0;
      
      // Track max distance (cumulative)
      if (distance > lastDistance) {
        lastDistance = distance;
      }
      
      // Only include readings with valid HR
      if (heartRate > 0) {
        hrReadings.push({
          timestamp,
          heartRate,
          speed: speed > 0 ? speed : undefined,
          cadence: record.cadence || undefined,
          altitude: record.altitude || record.enhanced_altitude || undefined,
          temperature: record.temperature || undefined,
          power: record.power || undefined,
          distance: distance > 0 ? distance * 1000 : undefined, // Convert km to meters
          latitude: record.position_lat || undefined,
          longitude: record.position_long || undefined,
        });
        
        totalHR += heartRate;
        hrCount++;
        if (heartRate > maxHR) maxHR = heartRate;
      }
      
      // Track speed stats
      if (speed > 0) {
        totalSpeed += speed;
        speedCount++;
        if (speed > maxSpeed) maxSpeed = speed;
      }
    }
    
    if (hrReadings.length === 0) {
      console.warn(`[CorosWorkoutParser] ⚠️ No valid HR readings found`);
      return null;
    }
    
    // Calculate end time from last reading or session total_elapsed_time
    const durationSec = session.total_elapsed_time || 
      session.total_timer_time || 
      Math.round((hrReadings[hrReadings.length - 1].timestamp.getTime() - startTime.getTime()) / 1000);
    
    const endTime = new Date(startTime.getTime() + durationSec * 1000);
    
    // Format date and time strings
    const date = startTime.toISOString().split('T')[0];
    const startTimeStr = startTime.toISOString().split('T')[1].split('.')[0];
    
    // Get total distance from session or last record
    // FIT distance is usually in meters, convert to km
    let totalDistanceKm = session.total_distance ? session.total_distance / 1000 : undefined;
    if (!totalDistanceKm && lastDistance > 0) {
      totalDistanceKm = lastDistance; // Already in km from parser config
    }
    
    return {
      name: session.event || `Coros ${sportName}`,
      sport: sportName,
      sportType,
      date,
      startTimeStr,
      startTime,
      endTime,
      durationSec,
      
      avgHeartRate: hrCount > 0 ? Math.round(totalHR / hrCount) : undefined,
      maxHeartRate: maxHR > 0 ? maxHR : undefined,
      totalDistanceKm,
      avgSpeedKmh: speedCount > 0 ? Math.round(totalSpeed / speedCount * 10) / 10 : undefined,
      maxSpeedKmh: maxSpeed > 0 ? Math.round(maxSpeed * 10) / 10 : undefined,
      
      hrReadings,
    };
  }
  
  /**
   * Find overlap between Coros workout and Luna workout time windows
   * @param corosWorkout Parsed Coros workout
   * @param lunaStartTime Luna workout start time
   * @param lunaEndTime Luna workout end time
   * @param minOverlapPercent Minimum overlap percentage required (default 50%)
   * @returns Match result with overlap percentage, or null if no overlap
   */
  static findWorkoutOverlap(
    corosWorkout: ICorosWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { overlapPercent: number; isMatch: boolean } | null {
    
    const corosStart = corosWorkout.startTime.getTime();
    const corosEnd = corosWorkout.endTime.getTime();
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();
    
    // Calculate overlap window
    const overlapStart = Math.max(corosStart, lunaStart);
    const overlapEnd = Math.min(corosEnd, lunaEnd);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    
    // Calculate overlap as percentage of Luna workout duration
    const lunaDuration = lunaEnd - lunaStart;
    if (lunaDuration <= 0) return null;
    
    const overlapPercent = (overlapMs / lunaDuration) * 100;
    
    console.log(`[CorosWorkoutParser] Overlap calculation:`);
    console.log(`   - Coros: ${corosWorkout.startTime.toISOString()} to ${corosWorkout.endTime.toISOString()}`);
    console.log(`   - Luna:  ${lunaStartTime.toISOString()} to ${lunaEndTime.toISOString()}`);
    console.log(`   - Overlap: ${overlapPercent.toFixed(1)}% (threshold: ${minOverlapPercent}%)`);
    
    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPercent,
    };
  }
  
  /**
   * Extract HR readings within a specific time window
   * Useful for getting only the overlapping portion of Coros data
   * @param corosWorkout Parsed Coros workout
   * @param startTime Window start time
   * @param endTime Window end time
   * @returns Array of HR readings within the window
   */
  static extractHRInTimeWindow(
    corosWorkout: ICorosWorkout,
    startTime: Date,
    endTime: Date
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    
    return corosWorkout.hrReadings.filter(r => {
      const ts = r.timestamp.getTime();
      return ts >= startMs && ts <= endMs;
    }).map(r => ({
      timestamp: r.timestamp,
      heartRate: r.heartRate,
    }));
  }
}

/**
 * Type definitions for fit-file-parser output
 */
interface FitData {
  sessions?: FitSession[];
  records?: FitRecord[];
  laps?: FitLap[];
  activity?: Record<string, unknown>;
}

interface FitSession {
  timestamp?: string | Date;
  start_time?: string | Date;
  sport?: string;
  sub_sport?: string;
  total_elapsed_time?: number;
  total_timer_time?: number;
  total_distance?: number;
  total_calories?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  avg_speed?: number;
  max_speed?: number;
  event?: string;
}

interface FitRecord {
  timestamp?: string | Date;
  heart_rate?: number;
  speed?: number;
  enhanced_speed?: number;
  distance?: number;
  cadence?: number;
  altitude?: number;
  enhanced_altitude?: number;
  temperature?: number;
  power?: number;
  position_lat?: number;
  position_long?: number;
}

interface FitLap {
  timestamp?: string | Date;
  start_time?: string | Date;
  total_elapsed_time?: number;
  total_distance?: number;
}
