import React from 'react';
import { 
  Activity, 
  Bike, 
  Dumbbell, 
  Footprints, 
  Mountain, 
  PersonStanding,
  Waves,
  Target,
  Timer,
  Dribbble,
  Swords,
  Music,
  Snowflake
} from 'lucide-react';

interface WorkoutSportBadgeProps {
  sportType: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Luna Sport Type Mappings (from Android SDK)
 * Key sport types with display info
 */
const SPORT_TYPES: Record<number, { name: string; icon: typeof Activity; color: string }> = {
  // Running
  1: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' },
  3: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' },
  66: { name: 'Treadmill', icon: Activity, color: 'text-orange-400' },
  139: { name: 'Marathon', icon: Activity, color: 'text-orange-600' },
  206: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' },
  207: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' },
  220: { name: 'Running', icon: Activity, color: 'text-orange-500' },
  246: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' }, // Bracelet
  247: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' }, // Bracelet
  
  // Walking
  2: { name: 'Outdoor Walking', icon: Footprints, color: 'text-green-500' },
  135: { name: 'Indoor Walking', icon: Footprints, color: 'text-green-400' },
  208: { name: 'Walking', icon: Footprints, color: 'text-green-500' },
  251: { name: 'Outdoor Walking', icon: Footprints, color: 'text-green-500' }, // Bracelet
  
  // Hiking/Trekking
  4: { name: 'Trekking', icon: Mountain, color: 'text-emerald-600' },
  5: { name: 'Trail Running', icon: Mountain, color: 'text-emerald-500' },
  13: { name: 'Outdoor Hiking', icon: Mountain, color: 'text-emerald-600' },
  229: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' },
  249: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' }, // Bracelet
  252: { name: 'Trail Running', icon: Mountain, color: 'text-emerald-500' }, // Bracelet
  
  // Cycling
  6: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' },
  7: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' },
  14: { name: 'BMX', icon: Bike, color: 'text-blue-600' },
  124: { name: 'Mountain Cycling', icon: Bike, color: 'text-blue-600' },
  209: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' },
  210: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' },
  221: { name: 'Cycling', icon: Bike, color: 'text-blue-500' },
  244: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' }, // Bracelet
  245: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' }, // Bracelet
  253: { name: 'Spinning Bike', icon: Bike, color: 'text-blue-400' }, // Bracelet
  
  // Swimming
  21: { name: 'Pool Swimming', icon: Waves, color: 'text-cyan-500' },
  22: { name: 'Open Water', icon: Waves, color: 'text-cyan-600' },
  200: { name: 'Pool Swimming', icon: Waves, color: 'text-cyan-500' },
  219: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' },
  248: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' }, // Bracelet
  
  // Gym/Fitness
  8: { name: 'Freestyle', icon: Dumbbell, color: 'text-purple-500' },
  23: { name: 'Core Training', icon: Dumbbell, color: 'text-purple-500' },
  25: { name: 'Strength Training', icon: Dumbbell, color: 'text-purple-600' },
  30: { name: 'Indoor Fitness', icon: Dumbbell, color: 'text-purple-500' },
  34: { name: 'Elliptical', icon: Dumbbell, color: 'text-purple-400' },
  64: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  84: { name: 'CrossFit', icon: Dumbbell, color: 'text-purple-600' },
  121: { name: 'Rowing Machine', icon: Dumbbell, color: 'text-purple-500' },
  122: { name: 'Rope Skipping', icon: Timer, color: 'text-red-400' },
  223: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  228: { name: 'Strength Training', icon: Dumbbell, color: 'text-purple-600' },
  
  // Yoga/Pilates
  28: { name: 'Pilates', icon: PersonStanding, color: 'text-pink-500' },
  35: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  215: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  266: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  233: { name: 'Pilates', icon: PersonStanding, color: 'text-pink-500' },
  
  // Ball Sports
  9: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  10: { name: 'Football', icon: Dribbble, color: 'text-green-600' },
  11: { name: 'Pingpong', icon: Target, color: 'text-yellow-500' },
  12: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  39: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  105: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  134: { name: 'Golf', icon: Target, color: 'text-green-700' },
  155: { name: 'Pickleball', icon: Target, color: 'text-lime-600' },
  211: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  212: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  213: { name: 'Soccer', icon: Dribbble, color: 'text-green-600' },
  214: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  230: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  256: { name: 'Golf', icon: Target, color: 'text-green-700' },
  257: { name: 'Soccer', icon: Dribbble, color: 'text-green-600' },
  258: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  259: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  262: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  265: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  
  // Dancing
  47: { name: 'Ballet', icon: Music, color: 'text-pink-400' },
  52: { name: 'Dance', icon: Music, color: 'text-pink-500' },
  53: { name: 'Zumba', icon: Music, color: 'text-pink-600' },
  226: { name: 'Dance', icon: Music, color: 'text-pink-500' },
  227: { name: 'Zumba', icon: Music, color: 'text-pink-600' },
  
  // Martial Arts
  56: { name: 'Boxing', icon: Swords, color: 'text-red-600' },
  59: { name: 'Tai Chi', icon: PersonStanding, color: 'text-indigo-500' },
  61: { name: 'Taekwondo', icon: Swords, color: 'text-red-500' },
  62: { name: 'Martial Arts', icon: Swords, color: 'text-red-500' },
  125: { name: 'Kickboxing', icon: Swords, color: 'text-red-600' },
  
  // Winter Sports
  126: { name: 'Skiing', icon: Snowflake, color: 'text-sky-500' },
  128: { name: 'Snowboarding', icon: Snowflake, color: 'text-sky-600' },
  
  // Triathlon
  123: { name: 'Triathlon', icon: Activity, color: 'text-amber-500' },
  204: { name: 'Triathlon', icon: Activity, color: 'text-amber-500' },
  
  // Generic workout
  0: { name: 'Workout', icon: Target, color: 'text-gray-500' },
};

const getSportInfo = (sportType: number) => {
  const sport = SPORT_TYPES[sportType] || SPORT_TYPES[0];

  return sport.name.toLowerCase() === "yoga"
    ? { ...sport, name: "Strength Training" }
    : sport;
};

const sizeClasses = {
  sm: { icon: 14, text: 'text-xs', padding: 'px-2 py-1' },
  md: { icon: 18, text: 'text-sm', padding: 'px-3 py-1.5' },
  lg: { icon: 22, text: 'text-base', padding: 'px-4 py-2' },
};

export const WorkoutSportBadge: React.FC<WorkoutSportBadgeProps> = ({ 
  sportType, 
  showLabel = true,
  size = 'md' 
}) => {
  const sport = getSportInfo(sportType);
  const Icon = sport.icon;
  const sizeConfig = sizeClasses[size];

  return (
    <span 
      className={`inline-flex items-center gap-1.5 ${sizeConfig.padding} bg-gray-100 rounded-full`}
    >
      <Icon size={sizeConfig.icon} className={sport.color} />
      {showLabel && (
        <span className={`${sizeConfig.text} font-medium text-gray-700`}>
          {sport.name}
        </span>
      )}
    </span>
  );
};

// Export utility for getting sport name
export const getSportName = (sportType: number): string => {
  return getSportInfo(sportType).name;
};

export default WorkoutSportBadge;
