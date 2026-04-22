import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout from WHOOP data in Apple Health export
 * Interface matches IPolarWorkout for seamless integration
 */
export interface IWhoopWorkout {
  // Summary
  name: string;
  sport: string;
  sportType: number;           // Mapped Luna sport type
  date: string;                // YYYY-MM-DD
  startTimeStr: string;        // HH:MM:SS
  startTime: Date;
  endTime: Date;
  durationSec: number;
  
  // Summary stats
  avgHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;           // from WorkoutStatistics
  strain?: number;             // WHOOP-specific metadata
  
  // Per-reading HR (6-sec intervals from WHOOP)
  hrReadings: Array<{
    timestamp: Date;
    heartRate: number;
  }>;
  
  // Internal linking
  workoutUUID: string;         // whoop://workout/{UUID}
}

/**
 * Temporary HR record during parsing (before linking to workout)
 */
interface TempHRRecord {
  workoutUUID: string;
  index: number;
  timestamp: Date;
  heartRate: number;
}

/**
 * Apple workout activity type to Luna sport type mapping
 * Same as AppleHealthWorkoutParser
 */
const APPLE_TO_LUNA_SPORT_TYPE: Record<string, number> = {
  // Running
  'HKWorkoutActivityTypeRunning': 1,
  'HKWorkoutActivityTypeIndoorRunning': 3,
  // Walking
  'HKWorkoutActivityTypeWalking': 2,
  // Hiking
  'HKWorkoutActivityTypeHiking': 13,
  // Cycling
  'HKWorkoutActivityTypeCycling': 6,
  'HKWorkoutActivityTypeIndoorCycling': 7,
  // Swimming
  'HKWorkoutActivityTypeSwimming': 21,
  'HKWorkoutActivityTypePoolSwim': 21,
  'HKWorkoutActivityTypeOpenWaterSwim': 22,
  // Gym/Fitness
  'HKWorkoutActivityTypeYoga': 35,
  'HKWorkoutActivityTypePilates': 28,
  'HKWorkoutActivityTypeElliptical': 34,
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 94,
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 25,
  'HKWorkoutActivityTypeCoreTraining': 23,
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 64,
  'HKWorkoutActivityTypeCrossTraining': 84,
  'HKWorkoutActivityTypeRowing': 121,
  'HKWorkoutActivityTypeJumpRope': 122,
  'HKWorkoutActivityTypeStairClimbing': 83,
  'HKWorkoutActivityTypeStepTraining': 32,
  // Ball Sports
  'HKWorkoutActivityTypeBadminton': 12,
  'HKWorkoutActivityTypeTennis': 105,
  'HKWorkoutActivityTypeTableTennis': 11,
  'HKWorkoutActivityTypeBasketball': 9,
  'HKWorkoutActivityTypeSoccer': 10,
  'HKWorkoutActivityTypeAmericanFootball': 154,
  'HKWorkoutActivityTypeCricket': 39,
  'HKWorkoutActivityTypeGolf': 134,
  'HKWorkoutActivityTypeVolleyball': 45,
  'HKWorkoutActivityTypeSquash': 42,
  'HKWorkoutActivityTypePickleball': 155,
  // Dancing
  'HKWorkoutActivityTypeDance': 52,
  // Martial Arts
  'HKWorkoutActivityTypeBoxing': 56,
  'HKWorkoutActivityTypeMartialArts': 58,
  'HKWorkoutActivityTypeKickboxing': 57,
  // Other
  'HKWorkoutActivityTypeOther': 0,
};

/**
 * WHOOP Workout Parser
 * Parses WHOOP workout and HR data from Apple Health export.xml
 * 
 * WHOOP data structure:
 * 1. <Workout sourceName="WHOOP"> elements contain workout summary + UUID
 * 2. <Record type="HeartRate" sourceName="WHOOP"> elements contain HR readings linked by UUID
 * 
 * HR readings are at 6-second intervals, linked via whoop://workout/{UUID}/hr/{index}
 */
export class WhoopWorkoutParser {
  
  /**
   * Parse all WHOOP workouts from Apple Health export.xml
   * Same pattern as AppleHealthWorkoutParser.parseWorkouts()
   * 
   * @param filePath Path to export.xml
   * @param filterStartTime Optional start time filter
   * @param filterEndTime Optional end time filter
   * @returns Array of parsed WHOOP workouts with linked HR readings
   */
  static async parseWorkouts(
    filePath: string,
    filterStartTime?: Date,
    filterEndTime?: Date
  ): Promise<IWhoopWorkout[]> {
    console.log(`[WhoopWorkoutParser] Parsing file: ${filePath}`);
    if (filterStartTime) {
      console.log(`[WhoopWorkoutParser] Time filter: ${filterStartTime.toISOString()} to ${filterEndTime?.toISOString() || 'end'}`);
    }
    
    // Temporary storage during streaming
    const workouts: Map<string, Partial<IWhoopWorkout>> = new Map();
    const hrRecords: TempHRRecord[] = [];
    
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      let lineCount = 0;
      let workoutCount = 0;
      let hrCount = 0;
      
      // Workout parsing state
      let inWorkoutBlock = false;
      let currentWorkout: Partial<IWhoopWorkout> | null = null;
      let workoutBuffer = '';
      
      rl.on('line', (line: string) => {
        lineCount++;
        
        // === Parse WHOOP Workout elements ===
        if (line.includes('<Workout') && line.includes('sourceName="WHOOP"')) {
          inWorkoutBlock = true;
          workoutBuffer = line;
          currentWorkout = this.parseWorkoutAttributes(line);
          
          // Check if self-closing
          if (line.includes('/>')) {
            if (currentWorkout && currentWorkout.workoutUUID) {
              if (this.isInTimeRange(currentWorkout, filterStartTime, filterEndTime)) {
                workouts.set(currentWorkout.workoutUUID, currentWorkout);
                workoutCount++;
              }
            }
            inWorkoutBlock = false;
            currentWorkout = null;
            workoutBuffer = '';
          }
        }
        // Inside workout block
        else if (inWorkoutBlock && currentWorkout) {
          workoutBuffer += ' ' + line.trim();
          
          // Parse metadata (UUID, strain)
          if (line.includes('<MetadataEntry')) {
            this.parseWorkoutMetadata(line, currentWorkout);
          }
          
          // Parse WorkoutStatistics (calories)
          if (line.includes('<WorkoutStatistics')) {
            this.parseWorkoutStatistics(line, currentWorkout);
          }
          
          // End of workout block
          if (line.includes('</Workout>')) {
            if (currentWorkout.workoutUUID) {
              if (this.isInTimeRange(currentWorkout, filterStartTime, filterEndTime)) {
                workouts.set(currentWorkout.workoutUUID, currentWorkout);
                workoutCount++;
                
                if (workoutCount <= 3) {
                  console.log(`[WhoopWorkoutParser] Found workout: ${currentWorkout.sport}, ` +
                    `UUID: ${currentWorkout.workoutUUID?.substring(0, 20)}..., ` +
                    `start: ${currentWorkout.startTime?.toISOString()}`);
                }
              }
            }
            inWorkoutBlock = false;
            currentWorkout = null;
            workoutBuffer = '';
          }
        }
        
        // === Parse WHOOP HR Record elements ===
        // Format: <Record type="HKQuantityTypeIdentifierHeartRate" sourceName="WHOOP" ...>
        if (line.includes('<Record') && 
            line.includes('type="HKQuantityTypeIdentifierHeartRate"') && 
            line.includes('sourceName="WHOOP"')) {
          
          const hrRecord = this.parseHRRecord(line);
          if (hrRecord) {
            hrRecords.push(hrRecord);
            hrCount++;
          }
        }
        
        // Also check for metadata in HR records (multi-line)
        // The SyncIdentifier linking HR to workout is in MetadataEntry
        if (line.includes('<MetadataEntry') && line.includes('HKMetadataKeySyncIdentifier') && line.includes('whoop://workout/')) {
          // This is a follow-up line to an HR record - we need to track state differently
          // For simplicity, we parse this within the Record element handling
        }
        
        // Progress logging
        if (lineCount % 500000 === 0) {
          console.log(`[WhoopWorkoutParser] Processed ${lineCount} lines... (${workoutCount} workouts, ${hrCount} HR records)`);
        }
      });
      
      rl.on('close', () => {
        console.log(`[WhoopWorkoutParser] Parsing complete. Scanned ${lineCount} lines`);
        console.log(`[WhoopWorkoutParser] Found ${workoutCount} WHOOP workouts, ${hrCount} HR records`);
        
        if (workouts.size === 0) {
          console.log(`[WhoopWorkoutParser] No WHOOP workouts found`);
          resolve([]);
          return;
        }
        
        // Link HR records to workouts
        const linkedWorkouts = this.linkHRToWorkouts(workouts, hrRecords);
        
        console.log(`[WhoopWorkoutParser] ✅ Returning ${linkedWorkouts.length} WHOOP workouts with HR data`);
        
        // Log summary for each workout
        for (const w of linkedWorkouts.slice(0, 3)) {
          console.log(`   - ${w.sport}: ${w.startTime.toISOString()}, ${w.hrReadings.length} HR readings, ${w.calories || 0}kcal`);
        }
        
        resolve(linkedWorkouts);
      });
      
      rl.on('error', (error) => {
        console.error(`[WhoopWorkoutParser] Error parsing file:`, error);
        reject(error);
      });
    });
  }
  
  /**
   * Parse workout attributes from <Workout> element
   */
  private static parseWorkoutAttributes(line: string): Partial<IWhoopWorkout> {
    const workout: Partial<IWhoopWorkout> = {
      hrReadings: [],
    };
    
    // Extract workoutActivityType
    const typeMatch = line.match(/workoutActivityType="([^"]+)"/);
    if (typeMatch) {
      const activityType = typeMatch[1];
      workout.sportType = APPLE_TO_LUNA_SPORT_TYPE[activityType] ?? 0;
      // Clean sport name: "HKWorkoutActivityTypeRunning" -> "Running"
      workout.sport = activityType.replace('HKWorkoutActivityType', '').toLowerCase();
      workout.name = workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1);
    }
    
    // Extract duration
    const durationMatch = line.match(/duration="([^"]+)"/);
    const durationUnitMatch = line.match(/durationUnit="([^"]+)"/);
    if (durationMatch) {
      const durationValue = parseFloat(durationMatch[1]);
      const durationUnit = durationUnitMatch ? durationUnitMatch[1] : 'min';
      
      if (durationUnit === 'min') {
        workout.durationSec = Math.round(durationValue * 60);
      } else if (durationUnit === 'sec') {
        workout.durationSec = Math.round(durationValue);
      } else if (durationUnit === 'hr') {
        workout.durationSec = Math.round(durationValue * 3600);
      }
    }
    
    // Extract startDate and endDate
    const startMatch = line.match(/startDate="([^"]+)"/);
    const endMatch = line.match(/endDate="([^"]+)"/);
    
    if (startMatch) {
      workout.startTime = this.parseAppleDate(startMatch[1]);
      workout.date = workout.startTime.toISOString().split('T')[0];
      workout.startTimeStr = workout.startTime.toISOString().split('T')[1].split('.')[0];
    }
    if (endMatch) {
      workout.endTime = this.parseAppleDate(endMatch[1]);
    }
    
    return workout;
  }
  
  /**
   * Parse workout metadata (UUID, strain)
   */
  private static parseWorkoutMetadata(line: string, workout: Partial<IWhoopWorkout>): void {
    const keyMatch = line.match(/key="([^"]+)"/);
    const valueMatch = line.match(/value="([^"]+)"/);
    
    if (!keyMatch || !valueMatch) return;
    
    const key = keyMatch[1];
    const value = valueMatch[1];
    
    if (key === 'HKMetadataKeySyncIdentifier' && value.startsWith('whoop://workout/')) {
      // Extract UUID: "whoop://workout/1535ac9d-aeee-4836-9840-5a7dd78b07ed"
      workout.workoutUUID = this.extractWorkoutUUID(value) || '';
    } else if (key === 'WHOOP Strain') {
      workout.strain = parseFloat(value);
    }
  }
  
  /**
   * Parse WorkoutStatistics element for calories
   */
  private static parseWorkoutStatistics(line: string, workout: Partial<IWhoopWorkout>): void {
    const typeMatch = line.match(/type="([^"]+)"/);
    const sumMatch = line.match(/sum="([^"]+)"/);
    
    if (!typeMatch || !sumMatch) return;
    
    const type = typeMatch[1];
    const sum = parseFloat(sumMatch[1]);
    
    if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
      workout.calories = Math.round(sum);
    }
  }
  
  /**
   * Parse HR Record element
   * Handles both single-line and multi-line records
   */
  private static parseHRRecord(line: string): TempHRRecord | null {
    // Extract HR value
    const valueMatch = line.match(/value="([^"]+)"/);
    if (!valueMatch) return null;
    
    const heartRate = parseInt(valueMatch[1]);
    if (isNaN(heartRate) || heartRate <= 0) return null;
    
    // Extract timestamp
    const startMatch = line.match(/startDate="([^"]+)"/);
    if (!startMatch) return null;
    
    const timestamp = this.parseAppleDate(startMatch[1]);
    
    // Try to extract UUID from same line (if MetadataEntry is inline)
    // Usually it's on a separate line, so we need to handle that differently
    // For now, we'll link by time window instead of UUID for simplicity
    
    return {
      workoutUUID: '', // Will link by time window
      index: 0,
      timestamp,
      heartRate,
    };
  }
  
  /**
   * Extract workout UUID from sync identifier
   * "whoop://workout/1535ac9d-aeee-4836-9840-5a7dd78b07ed" -> "1535ac9d-aeee-4836-9840-5a7dd78b07ed"
   */
  private static extractWorkoutUUID(syncIdentifier: string): string | null {
    const match = syncIdentifier.match(/whoop:\/\/workout\/([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }
  
  /**
   * Parse Apple Health date format
   * "2026-04-11 16:55:14 +0800" -> Date
   */
  private static parseAppleDate(dateStr: string): Date {
    // Format: "2026-04-11 16:55:14 +0800"
    // Convert to ISO: "2026-04-11T16:55:14+08:00"
    const parts = dateStr.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{2})(\d{2})/);
    if (parts) {
      const isoStr = `${parts[1]}T${parts[2]}${parts[3]}:${parts[4]}`;
      return new Date(isoStr);
    }
    return new Date(dateStr);
  }
  
  /**
   * Check if workout is in time range
   */
  private static isInTimeRange(
    workout: Partial<IWhoopWorkout>,
    filterStartTime?: Date,
    filterEndTime?: Date
  ): boolean {
    if (!workout.startTime) return false;
    if (!filterStartTime) return true;
    
    const start = workout.startTime.getTime();
    const filterStart = filterStartTime.getTime();
    const filterEnd = filterEndTime ? filterEndTime.getTime() : Infinity;
    
    return start >= filterStart && start <= filterEnd;
  }
  
  /**
   * Link HR records to workouts by time window
   * Since UUID linking requires multi-line parsing, we use time-based matching
   */
  private static linkHRToWorkouts(
    workouts: Map<string, Partial<IWhoopWorkout>>,
    hrRecords: TempHRRecord[]
  ): IWhoopWorkout[] {
    const result: IWhoopWorkout[] = [];
    
    for (const [uuid, workout] of workouts) {
      if (!workout.startTime || !workout.endTime) continue;
      
      const startMs = workout.startTime.getTime();
      const endMs = workout.endTime.getTime();
      
      // Find HR records within workout time window
      const matchingHR = hrRecords
        .filter(hr => {
          const hrMs = hr.timestamp.getTime();
          return hrMs >= startMs && hrMs <= endMs;
        })
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        .map(hr => ({
          timestamp: hr.timestamp,
          heartRate: hr.heartRate,
        }));
      
      if (matchingHR.length === 0) {
        console.log(`[WhoopWorkoutParser] ⚠️ No HR records found for workout ${uuid?.substring(0, 20)}...`);
        continue;
      }
      
      // Calculate HR stats
      const hrValues = matchingHR.map(r => r.heartRate);
      const avgHR = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
      const maxHR = Math.max(...hrValues);
      
      result.push({
        name: workout.name || 'WHOOP Workout',
        sport: workout.sport || 'other',
        sportType: workout.sportType || 0,
        date: workout.date || '',
        startTimeStr: workout.startTimeStr || '',
        startTime: workout.startTime,
        endTime: workout.endTime,
        durationSec: workout.durationSec || 0,
        avgHeartRate: avgHR,
        maxHeartRate: maxHR,
        calories: workout.calories,
        strain: workout.strain,
        hrReadings: matchingHR,
        workoutUUID: uuid,
      });
      
      console.log(`[WhoopWorkoutParser] Linked ${matchingHR.length} HR records to workout ${uuid?.substring(0, 20)}...`);
    }
    
    // Sort by start time
    result.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    return result;
  }
  
  /**
   * Find WHOOP workout that best matches a Luna workout by time overlap
   * Same pattern as AppleHealthWorkoutParser.findMatchingWorkout()
   * 
   * @param whoopWorkouts Array of WHOOP workouts
   * @param lunaStartTime Luna workout start time
   * @param lunaEndTime Luna workout end time
   * @param minOverlapPercent Minimum overlap percentage required (default 50%)
   * @returns Best matching WHOOP workout or null
   */
  static findMatchingWorkout(
    whoopWorkouts: IWhoopWorkout[],
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { workout: IWhoopWorkout; overlapPercent: number } | null {
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();
    const lunaDuration = lunaEnd - lunaStart;
    
    if (lunaDuration <= 0) return null;
    
    let bestMatch: IWhoopWorkout | null = null;
    let bestOverlapPercent = 0;
    
    for (const whoopWorkout of whoopWorkouts) {
      const whoopStart = whoopWorkout.startTime.getTime();
      const whoopEnd = whoopWorkout.endTime.getTime();
      
      // Calculate overlap
      const overlapStart = Math.max(lunaStart, whoopStart);
      const overlapEnd = Math.min(lunaEnd, whoopEnd);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      // Calculate overlap as percentage of Luna workout duration
      const overlapPercent = (overlapDuration / lunaDuration) * 100;
      
      if (overlapPercent > bestOverlapPercent) {
        bestOverlapPercent = overlapPercent;
        bestMatch = whoopWorkout;
      }
    }
    
    if (bestMatch && bestOverlapPercent >= minOverlapPercent) {
      console.log(`[WhoopWorkoutParser] Found matching workout: ${bestMatch.sport} ` +
        `with ${bestOverlapPercent.toFixed(1)}% overlap, ${bestMatch.hrReadings.length} HR readings`);
      return { workout: bestMatch, overlapPercent: bestOverlapPercent };
    }
    
    console.log(`[WhoopWorkoutParser] No matching workout found (best overlap: ${bestOverlapPercent.toFixed(1)}%)`);
    return null;
  }
  
  /**
   * Find overlap between WHOOP workout and Luna workout time windows
   * @deprecated Use findMatchingWorkout() for array support
   * @param whoopWorkout Parsed WHOOP workout
   * @param lunaStartTime Luna workout start time
   * @param lunaEndTime Luna workout end time
   * @param minOverlapPercent Minimum overlap percentage required (default 50%)
   * @returns Match result with overlap percentage, or null if no overlap
   */
  static findWorkoutOverlap(
    whoopWorkout: IWhoopWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { overlapPercent: number; isMatch: boolean } | null {
    
    const whoopStart = whoopWorkout.startTime.getTime();
    const whoopEnd = whoopWorkout.endTime.getTime();
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();
    
    // Calculate overlap window
    const overlapStart = Math.max(whoopStart, lunaStart);
    const overlapEnd = Math.min(whoopEnd, lunaEnd);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    
    // Calculate overlap as percentage of Luna workout duration
    const lunaDuration = lunaEnd - lunaStart;
    if (lunaDuration <= 0) return null;
    
    const overlapPercent = (overlapMs / lunaDuration) * 100;
    
    console.log(`[WhoopWorkoutParser] Overlap calculation:`);
    console.log(`   - WHOOP: ${whoopWorkout.startTime.toISOString()} to ${whoopWorkout.endTime.toISOString()}`);
    console.log(`   - Luna:  ${lunaStartTime.toISOString()} to ${lunaEndTime.toISOString()}`);
    console.log(`   - Overlap: ${overlapPercent.toFixed(1)}% (threshold: ${minOverlapPercent}%)`);
    
    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPercent,
    };
  }
  
  /**
   * Extract HR readings within a specific time window
   * Useful for getting only the overlapping portion of WHOOP data
   * @param whoopWorkout Parsed WHOOP workout
   * @param startTime Window start time
   * @param endTime Window end time
   * @returns Array of HR readings within the window
   */
  static extractHRInTimeWindow(
    whoopWorkout: IWhoopWorkout,
    startTime: Date,
    endTime: Date
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    
    return whoopWorkout.hrReadings.filter(r => {
      const ts = r.timestamp.getTime();
      return ts >= startMs && ts <= endMs;
    }).map(r => ({
      timestamp: r.timestamp,
      heartRate: r.heartRate,
    }));
  }
}
