import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Parsed workout from Polar CSV export
 */
export interface IPolarWorkout {
  // Summary from header row
  name: string;
  sport: string;
  sportType: number;           // Mapped Luna sport type
  date: string;                // YYYY-MM-DD
  startTimeStr: string;        // HH:MM:SS
  startTime: Date;
  endTime: Date;
  durationSec: number;
  
  // Summary stats from header
  avgHeartRate?: number;
  maxHeartRate?: number;       // Computed from readings if not in header
  calories?: number;
  totalDistanceKm?: number;    // km
  avgSpeedKmh?: number;        // km/h
  maxSpeedKmh?: number;        // km/h
  avgPace?: string;            // min/km
  maxPace?: string;            // min/km
  avgCadence?: number;
  avgStrideLengthCm?: number;
  trainingLoad?: number;
  ascentM?: number;
  descentM?: number;
  avgPower?: number;
  maxPower?: number;
  
  // User info from header
  heightCm?: number;
  weightKg?: number;
  hrMax?: number;
  hrSit?: number;
  vo2max?: number;
  
  // Per-second HR readings
  hrReadings: Array<{
    timestamp: Date;
    heartRate: number;
    speed?: number;
    cadence?: number;
    altitude?: number;
    temperature?: number;
    power?: number;
  }>;
}

/**
 * Polar sport to Luna sport type mapping
 * Luna sport types reference:
 * 1=Running, 2=Cycling, 3=IndoorCycling, 4=Swimming, 5=OpenWaterSwim,
 * 6=Hiking, 7=Yoga, 8=Elliptical, 9=Walking, 16=StrengthTraining,
 * 17=CoreTraining, 18=HIIT, 19=Badminton, 20=Tennis, 21=TableTennis,
 * Based on Luna Android SDK getSportName() function
 */
const POLAR_TO_LUNA_SPORT_TYPE: Record<string, number> = {
  // Running
  'RUNNING': 1,
  'OUTDOOR_RUNNING': 1,
  'INDOOR_RUNNING': 3,
  'TREADMILL': 66,
  'TREADMILL_RUNNING': 66,
  'TRAIL_RUNNING': 5,
  'MARATHON': 139,
  // Walking
  'WALKING': 2,
  'OUTDOOR_WALKING': 2,
  'INDOOR_WALKING': 135,
  // Hiking
  'HIKING': 13,
  'TREKKING': 4,
  // Cycling
  'CYCLING': 6,
  'OUTDOOR_CYCLING': 6,
  'ROAD_CYCLING': 6,
  'INDOOR_CYCLING': 7,
  'SPINNING': 7,
  'MOUNTAIN_BIKING': 124,
  // Swimming
  'SWIMMING': 21,
  'POOL_SWIMMING': 21,
  'OPEN_WATER_SWIMMING': 22,
  'OPEN_WATER': 22,
  // Gym/Fitness
  'YOGA': 35,
  'PILATES': 28,
  'ELLIPTICAL': 34,
  'CROSS_TRAINER': 34,
  'STRENGTH_TRAINING': 25,
  'WEIGHT_TRAINING': 25,
  'FUNCTIONAL_TRAINING': 94,
  'CORE_TRAINING': 23,
  'CORE': 23,
  'HIIT': 64,
  'HIGH_INTENSITY_INTERVAL_TRAINING': 64,
  'CIRCUIT_TRAINING': 64,
  'CROSSFIT': 84,
  'CROSS_TRAINING': 84,
  'ROWING': 121,
  'ROWING_MACHINE': 121,
  'JUMP_ROPE': 122,
  'ROPE_SKIPPING': 122,
  // Ball Sports
  'BADMINTON': 12,
  'TENNIS': 105,
  'TABLE_TENNIS': 11,
  'PING_PONG': 11,
  'BASKETBALL': 9,
  'SOCCER': 10,
  'FOOTBALL': 10,
  'CRICKET': 39,
  'GOLF': 134,
  'VOLLEYBALL': 45,
  'SQUASH': 42,
  // Dancing
  'DANCE': 52,
  'DANCING': 52,
  'AEROBICS': 85,
  'ZUMBA': 53,
  // Martial Arts
  'BOXING': 56,
  'KICKBOXING': 125,
  'MARTIAL_ARTS': 62,
  // Other
  'MEDITATION': 150,
  'STRETCHING': 26,
  'TRIATHLON': 123,
  'OTHER': 0,
  'OTHER_OUTDOOR': 0,
  'OTHER_INDOOR': 0,
};

/**
 * Polar Workout Parser
 * Parses Polar workout CSV exports with two-part structure:
 * - Summary header (rows 1-2)
 * - Per-second HR data (rows 3+)
 * 
 * NOTE: Polar timestamps are already in IST - NO timezone offset applied
 */
export class PolarWorkoutParser {
  
  /**
   * Parse a Polar workout CSV file
   * @param filePath Path to the Polar CSV file
   * @returns Parsed Polar workout or null if invalid
   */
  static async parseWorkout(filePath: string): Promise<IPolarWorkout | null> {
    console.log(`[PolarWorkoutParser] Parsing file: ${filePath}`);
    
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      
      let lineNumber = 0;
      let workout: Partial<IPolarWorkout> = {
        hrReadings: [],
      };
      let summaryHeaderCols: string[] = [];
      let dataHeaderCols: string[] = [];
      let summaryParsed = false;
      let dataHeaderParsed = false;
      let workoutStartTime: Date | null = null;
      
      rl.on('line', (line: string) => {
        lineNumber++;
        
        // Skip empty lines
        if (line.trim() === '') return;
        
        const cols = this.parseCSVLine(line);
        
        // Line 1: Summary header row
        if (lineNumber === 1) {
          summaryHeaderCols = cols;
          return;
        }
        
        // Line 2: Summary data row
        if (lineNumber === 2 && !summaryParsed) {
          workout = this.parseSummaryRow(summaryHeaderCols, cols);
          workout.hrReadings = [];
          workoutStartTime = workout.startTime || null;
          summaryParsed = true;
          return;
        }
        
        // Line 3: Data header row (Sample rate, Time, HR, etc.)
        if (summaryParsed && !dataHeaderParsed) {
          dataHeaderCols = cols;
          dataHeaderParsed = true;
          return;
        }
        
        // Line 4+: HR data rows
        if (dataHeaderParsed && workoutStartTime) {
          const reading = this.parseDataRow(dataHeaderCols, cols, workoutStartTime);
          if (reading && reading.heartRate > 0) {
            workout.hrReadings!.push(reading);
          }
        }
      });
      
      rl.on('close', () => {
        if (workout.startTime && workout.hrReadings!.length > 0) {
          // Calculate max HR from readings if not in summary
          if (!workout.maxHeartRate) {
            const hrValues = workout.hrReadings!.map(r => r.heartRate).filter(h => h > 0);
            if (hrValues.length > 0) {
              workout.maxHeartRate = Math.max(...hrValues);
            }
          }
          
          console.log(`[PolarWorkoutParser] ✅ Parsed workout successfully:`);
          console.log(`   - Sport: ${workout.sport} (type: ${workout.sportType})`);
          console.log(`   - Start: ${workout.startTime?.toISOString()}`);
          console.log(`   - Duration: ${workout.durationSec}s`);
          console.log(`   - HR readings: ${workout.hrReadings!.length}`);
          console.log(`   - Avg HR: ${workout.avgHeartRate}, Max HR: ${workout.maxHeartRate}`);
          console.log(`   - Calories: ${workout.calories}`);
          
          resolve(workout as IPolarWorkout);
        } else {
          console.warn(`[PolarWorkoutParser] ⚠️ Invalid workout data in file`);
          console.warn(`   - startTime: ${workout.startTime}`);
          console.warn(`   - hrReadings count: ${workout.hrReadings?.length || 0}`);
          resolve(null);
        }
      });
      
      rl.on('error', (err) => {
        console.error(`[PolarWorkoutParser] ❌ Error reading file:`, err);
        reject(err);
      });
    });
  }
  
  /**
   * Parse a CSV line handling quoted values and commas
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  }
  
  /**
   * Parse summary row (line 2) with workout metadata
   */
  private static parseSummaryRow(
    headers: string[],
    values: string[]
  ): Partial<IPolarWorkout> {
    
    /**
     * Helper to get value by partial header match (case-insensitive)
     */
    const getVal = (headerPartial: string): string | undefined => {
      const idx = headers.findIndex(h => 
        h.toLowerCase().includes(headerPartial.toLowerCase())
      );
      return idx >= 0 && idx < values.length ? values[idx] : undefined;
    };
    
    /**
     * Helper to parse numeric value
     */
    const parseNum = (val: string | undefined): number | undefined => {
      if (!val || val.trim() === '') return undefined;
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    };
    
    // Parse date and time
    const dateStr = getVal('Date') || '';          // 2026-04-11
    const timeStr = getVal('Start time') || '';    // 10:41:10
    const durationStr = getVal('Duration') || '';  // 00:29:06
    
    // Parse start time - Polar time is in IST, convert to actual UTC
    let startTime: Date | undefined;
    let endTime: Date | undefined;
    let durationSec = 0;
    
    if (dateStr && timeStr) {
      // Polar CSV time is in IST - parse as UTC temporarily then subtract IST offset
      const dateTimeStr = `${dateStr}T${timeStr}Z`; // Parse as if UTC
      const istTime = new Date(dateTimeStr);
      
      // Subtract IST offset (5.5 hours) to get actual UTC
      const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
      startTime = new Date(istTime.getTime() - IST_OFFSET_MS);
    }
    
    // Parse duration (HH:MM:SS)
    if (durationStr) {
      const parts = durationStr.split(':');
      if (parts.length === 3) {
        durationSec = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      } else if (parts.length === 2) {
        // MM:SS format
        durationSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
    }
    
    // Calculate end time
    if (startTime && durationSec > 0) {
      endTime = new Date(startTime.getTime() + durationSec * 1000);
    }
    
    // Parse sport type
    const sport = getVal('Sport') || 'OTHER';
    const sportKey = sport.toUpperCase().replace(/\s+/g, '_');
    const sportType = POLAR_TO_LUNA_SPORT_TYPE[sportKey] ?? 0;
    
    return {
      name: getVal('Name') || '',
      sport: sport,
      sportType: sportType,
      date: dateStr,
      startTimeStr: timeStr,
      startTime: startTime,
      endTime: endTime,
      durationSec: durationSec,
      
      // HR stats
      avgHeartRate: parseNum(getVal('Average heart rate')),
      
      // Calories and distance
      calories: parseNum(getVal('Calories')),
      totalDistanceKm: parseNum(getVal('Total distance')),
      
      // Speed and pace
      avgSpeedKmh: parseNum(getVal('Average speed')),
      maxSpeedKmh: parseNum(getVal('Max speed')),
      avgPace: getVal('Average pace'),
      maxPace: getVal('Max pace'),
      
      // Other metrics
      avgCadence: parseNum(getVal('Average cadence')),
      avgStrideLengthCm: parseNum(getVal('Average stride length')),
      trainingLoad: parseNum(getVal('Training load')),
      ascentM: parseNum(getVal('Ascent')),
      descentM: parseNum(getVal('Descent')),
      avgPower: parseNum(getVal('Average power')),
      maxPower: parseNum(getVal('Max power')),
      
      // User info
      heightCm: parseNum(getVal('Height')),
      weightKg: parseNum(getVal('Weight')),
      hrMax: parseNum(getVal('HR max')),
      hrSit: parseNum(getVal('HR sit')),
      vo2max: parseNum(getVal('VO2max')),
    };
  }
  
  /**
   * Parse a data row (per-second HR reading)
   */
  private static parseDataRow(
    headers: string[],
    values: string[],
    startTime: Date
  ): {
    timestamp: Date;
    heartRate: number;
    speed?: number;
    cadence?: number;
    altitude?: number;
    temperature?: number;
    power?: number;
  } | null {
    
    /**
     * Helper to find column index by partial header match
     */
    const getIdx = (partial: string): number => {
      return headers.findIndex(h => h.toLowerCase().includes(partial.toLowerCase()));
    };
    
    const timeIdx = getIdx('Time');
    const hrIdx = getIdx('HR');
    
    if (timeIdx < 0 || hrIdx < 0) return null;
    
    const timeStr = values[timeIdx];  // HH:MM:SS offset from start
    const hrStr = values[hrIdx];
    
    // Skip rows with missing time or HR
    if (!timeStr || timeStr.trim() === '' || !hrStr || hrStr.trim() === '') {
      return null;
    }
    
    const hr = parseInt(hrStr);
    if (isNaN(hr) || hr <= 0) return null;
    
    // Parse time offset and add to start time
    const timeParts = timeStr.split(':');
    if (timeParts.length !== 3) return null;
    
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    const seconds = parseInt(timeParts[2]) || 0;
    const offsetMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    
    const timestamp = new Date(startTime.getTime() + offsetMs);
    
    // Parse optional fields
    const speedIdx = getIdx('Speed');
    const cadenceIdx = getIdx('Cadence');
    const altIdx = getIdx('Altitude');
    const tempIdx = getIdx('Temperature');
    const powerIdx = getIdx('Power');
    
    const parseNum = (idx: number): number | undefined => {
      if (idx < 0 || idx >= values.length || !values[idx] || values[idx].trim() === '') {
        return undefined;
      }
      const num = parseFloat(values[idx]);
      return isNaN(num) ? undefined : num;
    };
    
    return {
      timestamp,
      heartRate: hr,
      speed: parseNum(speedIdx),
      cadence: parseNum(cadenceIdx),
      altitude: parseNum(altIdx),
      temperature: parseNum(tempIdx),
      power: parseNum(powerIdx),
    };
  }
  
  /**
   * Find overlap between Polar workout and Luna workout time windows
   * @param polarWorkout Parsed Polar workout
   * @param lunaStartTime Luna workout start time
   * @param lunaEndTime Luna workout end time
   * @param minOverlapPercent Minimum overlap percentage required (default 50%)
   * @returns Match result with overlap percentage, or null if no overlap
   */
  static findWorkoutOverlap(
    polarWorkout: IPolarWorkout,
    lunaStartTime: Date,
    lunaEndTime: Date,
    minOverlapPercent: number = 50
  ): { overlapPercent: number; isMatch: boolean } | null {
    
    const polarStart = polarWorkout.startTime.getTime();
    const polarEnd = polarWorkout.endTime.getTime();
    const lunaStart = lunaStartTime.getTime();
    const lunaEnd = lunaEndTime.getTime();
    
    // Calculate overlap window
    const overlapStart = Math.max(polarStart, lunaStart);
    const overlapEnd = Math.min(polarEnd, lunaEnd);
    const overlapMs = Math.max(0, overlapEnd - overlapStart);
    
    // Calculate overlap as percentage of Luna workout duration
    const lunaDuration = lunaEnd - lunaStart;
    if (lunaDuration <= 0) return null;
    
    const overlapPercent = (overlapMs / lunaDuration) * 100;
    
    console.log(`[PolarWorkoutParser] Overlap calculation:`);
    console.log(`   - Polar: ${polarWorkout.startTime.toISOString()} to ${polarWorkout.endTime.toISOString()}`);
    console.log(`   - Luna:  ${lunaStartTime.toISOString()} to ${lunaEndTime.toISOString()}`);
    console.log(`   - Overlap: ${overlapPercent.toFixed(1)}% (threshold: ${minOverlapPercent}%)`);
    
    return {
      overlapPercent: Math.round(overlapPercent * 100) / 100,
      isMatch: overlapPercent >= minOverlapPercent,
    };
  }
  
  /**
   * Extract HR readings within a specific time window
   * Useful for getting only the overlapping portion of Polar data
   * @param polarWorkout Parsed Polar workout
   * @param startTime Window start time
   * @param endTime Window end time
   * @returns Array of HR readings within the window
   */
  static extractHRInTimeWindow(
    polarWorkout: IPolarWorkout,
    startTime: Date,
    endTime: Date
  ): Array<{ timestamp: Date; heartRate: number }> {
    const startMs = startTime.getTime();
    const endMs = endTime.getTime();
    
    return polarWorkout.hrReadings.filter(r => {
      const ts = r.timestamp.getTime();
      return ts >= startMs && ts <= endMs;
    }).map(r => ({
      timestamp: r.timestamp,
      heartRate: r.heartRate,
    }));
  }
}
