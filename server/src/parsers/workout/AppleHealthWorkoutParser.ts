import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout from Apple Health export.xml
 */
export interface IAppleWorkout {
  workoutActivityType: string;  // e.g., "HKWorkoutActivityTypeRunning"
  sportType: number;            // Mapped Luna sport type
  startTime: Date;
  endTime: Date;
  durationSec: number;
  durationMin: number;
  
  // Statistics from WorkoutStatistics elements
  activeCalories?: number;      // kcal
  totalCalories?: number;       // kcal (if available)
  distance?: number;            // meters
  distanceUnit?: string;        // original unit
  steps?: number;               // step count
  
  // Source info
  sourceName: string;
  sourceVersion?: string;
}

/**
 * Apple workout activity type to Luna sport type mapping
 * Based on Luna Android SDK getSportName() function
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
  'HKWorkoutActivityTypeAustralianFootball': 153,
  'HKWorkoutActivityTypeCricket': 39,
  'HKWorkoutActivityTypeGolf': 134,
  'HKWorkoutActivityTypeVolleyball': 45,
  'HKWorkoutActivityTypeSquash': 42,
  'HKWorkoutActivityTypePickleball': 155,
  'HKWorkoutActivityTypeRugby': 103,
  'HKWorkoutActivityTypeHockey': 104,
  'HKWorkoutActivityTypeBaseball': 40,
  'HKWorkoutActivityTypeSoftball': 43,
  'HKWorkoutActivityTypeHandball': 46,
  // Dancing
  'HKWorkoutActivityTypeDance': 52,
  'HKWorkoutActivityTypeSocialDance': 51,
  // Martial Arts
  'HKWorkoutActivityTypeBoxing': 56,
  'HKWorkoutActivityTypeKickboxing': 125,
  'HKWorkoutActivityTypeMartialArts': 62,
  'HKWorkoutActivityTypeWrestling': 58,
  'HKWorkoutActivityTypeTaiChi': 59,
  // Winter Sports
  'HKWorkoutActivityTypeSnowSports': 109,
  'HKWorkoutActivityTypeDownhillSkiing': 129,
  'HKWorkoutActivityTypeCrossCountrySkiing': 127,
  'HKWorkoutActivityTypeSnowboarding': 128,
  // Water Sports
  'HKWorkoutActivityTypeSurfingSports': 132,
  'HKWorkoutActivityTypePaddleSports': 67,
  'HKWorkoutActivityTypeWaterSports': 69,
  'HKWorkoutActivityTypeSailing': 16,
  // Other
  'HKWorkoutActivityTypeMindAndBody': 150,
  'HKWorkoutActivityTypeFlexibility': 29,
  'HKWorkoutActivityTypePreparationAndRecovery': 148,
  'HKWorkoutActivityTypeGymnastics': 33,
  'HKWorkoutActivityTypeTrackAndField': 119,
  'HKWorkoutActivityTypeArchery': 65,
  'HKWorkoutActivityTypeFishing': 36,
  'HKWorkoutActivityTypeEquestrianSports': 20,
  'HKWorkoutActivityTypeClimbing': 79,
  'HKWorkoutActivityTypeOther': 0,
};

/**
 * Apple Health Workout Parser
 * Parses HKWorkout records from export.xml using streaming
 */
export class AppleHealthWorkoutParser {
  
  /**
   * Parse all workouts from Apple Health export.xml
   * @param filePath Path to export.xml
   * @param filterStartTime Optional start time filter
   * @param filterEndTime Optional end time filter
   * @returns Array of parsed Apple workouts
   */
  static async parseWorkouts(
    filePath: string,
    filterStartTime?: Date,
    filterEndTime?: Date
  ): Promise<IAppleWorkout[]> {
    console.log(`[AppleHealthWorkoutParser] Parsing file: ${filePath}`);
    if (filterStartTime) {
      console.log(`[AppleHealthWorkoutParser] Filter: ${filterStartTime.toISOString()} to ${filterEndTime?.toISOString() || 'end'}`);
    }
    
    const workouts: IAppleWorkout[] = [];
    
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      let lineCount = 0;
      let workoutCount = 0;
      let totalWorkoutsProcessed = 0;
      let totalWorkouts2026 = 0;
      let currentWorkout: Partial<IAppleWorkout> | null = null;
      let inWorkoutBlock = false;
      let workoutBuffer = '';
      
      rl.on('line', (line: string) => {
        lineCount++;
        
        // Start of a Workout element (but NOT WorkoutStatistics or WorkoutEvent or WorkoutRoute)
        if (line.includes('<Workout') && !line.includes('<WorkoutStatistics') && !line.includes('<WorkoutEvent') && !line.includes('<WorkoutRoute')) {
          inWorkoutBlock = true;
          workoutBuffer = line;
          console.log(`[AppleHealthWorkoutParser] 🏋️ Starting workout block at line ${lineCount}`);
          
          // Check if workout ends on same line
          if (line.includes('</Workout>') || (line.includes('/>') && !line.includes('<WorkoutStatistics'))) {
            // Self-closing or single-line workout with no children
            currentWorkout = this.parseWorkoutLine(workoutBuffer);
            if (currentWorkout && this.isInTimeRange(currentWorkout, filterStartTime, filterEndTime)) {
              workouts.push(currentWorkout as IAppleWorkout);
              workoutCount++;
            }
            inWorkoutBlock = false;
            currentWorkout = null;
            workoutBuffer = '';
          } else {
            // Multi-line workout, parse the opening tag
            currentWorkout = this.parseWorkoutAttributes(workoutBuffer);
            console.log(`[AppleHealthWorkoutParser] 📋 Parsed workout: type=${currentWorkout?.workoutActivityType || 'MISSING'}, sportType=${currentWorkout?.sportType}`);
          }
        }
        // Inside a workout block
        else if (inWorkoutBlock) {
          workoutBuffer += ' ' + line.trim();
          
          // WorkoutStatistics element
          if (line.includes('<WorkoutStatistics')) {
            if (currentWorkout) {
              console.log(`[AppleHealthWorkoutParser] 🔍 Processing WorkoutStatistics line: ${line.trim().substring(0, 100)}...`);
              this.parseWorkoutStatistics(line, currentWorkout);
            } else {
              console.warn(`[AppleHealthWorkoutParser] ⚠️ Found WorkoutStatistics but currentWorkout is null!`);
            }
          }
          
          // End of Workout element
          if (line.includes('</Workout>')) {
            console.log(`[AppleHealthWorkoutParser] 🏁 Ending workout block at line ${lineCount}`);
            if (currentWorkout) {
              totalWorkoutsProcessed++;
              const inRange = this.isInTimeRange(currentWorkout, filterStartTime, filterEndTime);
              
              // Only log workouts from 2026 (first 20 of them)
              const year = currentWorkout.startTime?.getFullYear();
              if (year === 2026) {
                totalWorkouts2026++;
                if (totalWorkouts2026 <= 20) {
                  // Calculate duration if not present
                  let duration = 'N/A';
                  if (currentWorkout.durationMin) {
                    duration = currentWorkout.durationMin.toFixed(1);
                  } else if (currentWorkout.startTime && currentWorkout.endTime) {
                    const durationMs = currentWorkout.endTime.getTime() - currentWorkout.startTime.getTime();
                    duration = (durationMs / 60000).toFixed(1);
                  }
                  
                  console.log(`[AppleHealthWorkoutParser] 2026 Workout #${totalWorkouts2026}: ${currentWorkout.workoutActivityType || 'Unknown'}, ` +
                    `start: ${currentWorkout.startTime?.toISOString()}, end: ${currentWorkout.endTime?.toISOString()}, ` +
                    `duration: ${duration}min, inRange: ${inRange}`);
                }
              }
              
              if (inRange) {
                // Fill in defaults
                if (!currentWorkout.sportType) {
                  currentWorkout.sportType = 0;
                }
                
                // Calculate durationMin from timestamps if not present
                if (!currentWorkout.durationMin && currentWorkout.startTime && currentWorkout.endTime) {
                  const durationMs = currentWorkout.endTime.getTime() - currentWorkout.startTime.getTime();
                  currentWorkout.durationMin = durationMs / 60000;
                  currentWorkout.durationSec = durationMs / 1000;
                }
                
                workouts.push(currentWorkout as IAppleWorkout);
                workoutCount++;
                
                // Log every workout that passes filter
                const duration = currentWorkout.durationMin ? currentWorkout.durationMin.toFixed(1) : 'N/A';
                console.log(`[AppleHealthWorkoutParser] ✅ Found workout #${workoutCount}: ${currentWorkout.workoutActivityType}, ` +
                  `startTime: ${currentWorkout.startTime?.toISOString()}, endTime: ${currentWorkout.endTime?.toISOString()}, ` +
                  `duration: ${duration}min`);
                console.log(`[AppleHealthWorkoutParser]    📊 Stats: Calories=${currentWorkout.activeCalories || 'N/A'}, Distance=${currentWorkout.distance ? (currentWorkout.distance/1000).toFixed(2) + 'km' : 'N/A'}, Steps=${currentWorkout.steps || 'N/A'}`);
              }
            }
            
            inWorkoutBlock = false;
            currentWorkout = null;
            workoutBuffer = '';
          }
        }
        
        // Progress logging
        if (lineCount % 500000 === 0) {
          console.log(`[AppleHealthWorkoutParser] Processed ${lineCount} lines... (${workoutCount} workouts found)`);
        }
      });
      
      rl.on('close', () => {
        console.log(`[AppleHealthWorkoutParser] Parsing complete. Scanned ${lineCount} lines`);
        console.log(`[AppleHealthWorkoutParser] Total workouts in file: ${totalWorkoutsProcessed}`);
        console.log(`[AppleHealthWorkoutParser] Total 2026 workouts: ${totalWorkouts2026}`);
        console.log(`[AppleHealthWorkoutParser] Workouts in time range: ${workoutCount}`);
        resolve(workouts);
      });
      
      rl.on('error', (error) => {
        console.error(`[AppleHealthWorkoutParser] Error parsing file:`, error);
        reject(error);
      });
    });
  }
  
  /**
   * Find Apple workout that best matches a Luna workout by time overlap
   * @param appleWorkouts Array of Apple workouts
   * @param lunaStartTime Luna workout start time
   * @param lunaEndTime Luna workout end time
   * @param minOverlapPercent Minimum overlap percentage required (default 50%)
   * @returns Best matching Apple workout or null
   */
  static findMatchingWorkout(
    appleWorkouts: IAppleWorkout[],
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { workout: IAppleWorkout; overlapPercent: number } | null {
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();
    const lunaDuration = lunaEnd - lunaStart;
    
    let bestMatch: IAppleWorkout | null = null;
    let bestOverlapPercent = 0;
    
    for (const appleWorkout of appleWorkouts) {
      const appleStart = appleWorkout.startTime.getTime();
      const appleEnd = appleWorkout.endTime.getTime();
      
      // Calculate overlap
      const overlapStart = Math.max(lunaStart, appleStart);
      const overlapEnd = Math.min(lunaEnd, appleEnd);
      const overlapDuration = Math.max(0, overlapEnd - overlapStart);
      
      // Calculate overlap as percentage of Luna workout duration
      const overlapPercent = (overlapDuration / lunaDuration) * 100;
      
      if (overlapPercent > bestOverlapPercent) {
        bestOverlapPercent = overlapPercent;
        bestMatch = appleWorkout;
      }
    }
    
    if (bestMatch && bestOverlapPercent >= minOverlapPercent) {
      console.log(`[AppleHealthWorkoutParser] Found matching workout: ${bestMatch.workoutActivityType} ` +
        `with ${bestOverlapPercent.toFixed(1)}% overlap`);
      return { workout: bestMatch, overlapPercent: bestOverlapPercent };
    }
    
    console.log(`[AppleHealthWorkoutParser] No matching workout found (best overlap: ${bestOverlapPercent.toFixed(1)}%)`);
    return null;
  }
  
  /**
   * Parse workout attributes from the opening tag
   */
  private static parseWorkoutAttributes(line: string): Partial<IAppleWorkout> {
    const workout: Partial<IAppleWorkout> = {};
    
    // Extract workoutActivityType
    const typeMatch = line.match(/workoutActivityType="([^"]+)"/);
    if (typeMatch) {
      workout.workoutActivityType = typeMatch[1];
      workout.sportType = APPLE_TO_LUNA_SPORT_TYPE[typeMatch[1]] ?? 0;
    }
    
    // Extract duration
    const durationMatch = line.match(/duration="([^"]+)"/);
    const durationUnitMatch = line.match(/durationUnit="([^"]+)"/);
    if (durationMatch) {
      const durationValue = parseFloat(durationMatch[1]);
      const durationUnit = durationUnitMatch ? durationUnitMatch[1] : 'min';
      
      if (durationUnit === 'min') {
        workout.durationMin = durationValue;
        workout.durationSec = durationValue * 60;
      } else if (durationUnit === 'sec') {
        workout.durationSec = durationValue;
        workout.durationMin = durationValue / 60;
      } else if (durationUnit === 'hr') {
        workout.durationMin = durationValue * 60;
        workout.durationSec = durationValue * 3600;
      }
    }
    
    // Extract startDate and endDate
    // Format: "2022-03-16 11:01:29 +0800"
    const startMatch = line.match(/startDate="([^"]+)"/);
    const endMatch = line.match(/endDate="([^"]+)"/);
    
    if (startMatch) {
      workout.startTime = this.parseAppleDate(startMatch[1]);
    }
    if (endMatch) {
      workout.endTime = this.parseAppleDate(endMatch[1]);
    }
    
    // Extract source info
    const sourceNameMatch = line.match(/sourceName="([^"]+)"/);
    const sourceVersionMatch = line.match(/sourceVersion="([^"]+)"/);
    
    if (sourceNameMatch) {
      workout.sourceName = sourceNameMatch[1];
    }
    if (sourceVersionMatch) {
      workout.sourceVersion = sourceVersionMatch[1];
    }
    
    return workout;
  }
  
  /**
   * Parse WorkoutStatistics element for calories and distance
   */
  private static parseWorkoutStatistics(line: string, workout: Partial<IAppleWorkout>): void {
    const typeMatch = line.match(/type="([^"]+)"/);
    const sumMatch = line.match(/sum="([^"]+)"/);
    const unitMatch = line.match(/unit="([^"]+)"/);
    
    console.log(`[AppleParser] 🔍 Parsing WorkoutStatistics:`);
    console.log(`  - typeMatch: ${typeMatch ? typeMatch[1] : 'NULL'}`);
    console.log(`  - sumMatch: ${sumMatch ? sumMatch[1] : 'NULL'}`);
    console.log(`  - unitMatch: ${unitMatch ? unitMatch[1] : 'NULL'}`);
    
    if (!typeMatch || !sumMatch) {
      console.warn(`[AppleParser] ⚠️ Missing required attributes (type or sum)`);
      return;
    }
    
    const type = typeMatch[1];
    const sum = parseFloat(sumMatch[1]);
    const unit = unitMatch ? unitMatch[1] : '';
    
    if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') {
      workout.activeCalories = sum;
      console.log(`[AppleParser] ✅ Parsed ActiveCalories: ${sum} kcal`);
    } else if (type === 'HKQuantityTypeIdentifierBasalEnergyBurned') {
      // If we have both, calculate total
      if (workout.activeCalories) {
        workout.totalCalories = workout.activeCalories + sum;
        console.log(`[AppleParser] ✅ Parsed TotalCalories: ${workout.totalCalories} kcal (Active: ${workout.activeCalories}, Basal: ${sum})`);
      }
    } else if (type === 'HKQuantityTypeIdentifierStepCount') {
      // Parse step count
      workout.steps = Math.round(sum);
      console.log(`[AppleParser] ✅ Parsed Steps: ${workout.steps}`);
    } else if (type === 'HKQuantityTypeIdentifierDistanceWalkingRunning' ||
               type === 'HKQuantityTypeIdentifierDistanceCycling' ||
               type === 'HKQuantityTypeIdentifierDistanceSwimming') {
      // Convert to meters
      workout.distanceUnit = unit;
      if (unit === 'km') {
        workout.distance = sum * 1000;
      } else if (unit === 'm') {
        workout.distance = sum;
      } else if (unit === 'mi') {
        workout.distance = sum * 1609.34;
      } else {
        // Assume kilometers if unit not recognized
        workout.distance = sum * 1000;
      }
      console.log(`[AppleParser] ✅ Parsed Distance: ${workout.distance}m (${sum} ${unit})`);
    }
  }
  
  /**
   * Parse a single-line workout (rare case)
   */
  private static parseWorkoutLine(line: string): Partial<IAppleWorkout> | null {
    return this.parseWorkoutAttributes(line);
  }
  
  /**
   * Parse Apple Health date format using the embedded timezone
   * Input: "2026-04-23 08:00:10 +0530"
   * Output: Date object representing that exact moment in time
   */
  private static parseAppleDate(dateStr: string): Date {
    // Format: "2026-04-23 08:00:10 +0530"
    // Convert to ISO format: "2026-04-23T08:00:10+05:30"
    const dateTimePart = dateStr.substring(0, 19); // "2026-04-23 08:00:10"
    const tzPart = dateStr.substring(20).trim();   // "+0530"
    
    // Convert timezone from "+0530" to "+05:30" format
    let tzFormatted = tzPart;
    if (tzPart.length === 5 && !tzPart.includes(':')) {
      tzFormatted = tzPart.slice(0, 3) + ':' + tzPart.slice(3); // "+05:30"
    }
    
    // Build ISO string and parse
    const isoString = dateTimePart.replace(' ', 'T') + tzFormatted;
    const parsedDate = new Date(isoString);
    
    // Log first few parses to debug
    if (Math.random() < 0.001) {
      console.log(`[AppleHealthWorkoutParser] Date parse: "${dateStr}" -> "${isoString}" -> ${parsedDate.toISOString()}`);
    }
    
    return parsedDate;
  }
  
  /**
   * Check if workout is within time range filter
   */
  private static isInTimeRange(
    workout: Partial<IAppleWorkout>,
    filterStartTime?: Date,
    filterEndTime?: Date
  ): boolean {
    if (!workout.startTime) return false;
    
    if (filterStartTime && workout.startTime < filterStartTime) {
      return false;
    }
    if (filterEndTime && workout.endTime && workout.endTime > filterEndTime) {
      return false;
    }
    
    return true;
  }
}

export default AppleHealthWorkoutParser;
