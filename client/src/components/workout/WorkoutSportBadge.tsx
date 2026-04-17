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
  Timer
} from 'lucide-react';

interface WorkoutSportBadgeProps {
  sportType: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Sport type mappings based on common fitness app codes
const SPORT_TYPES: Record<number, { name: string; icon: typeof Activity; color: string }> = {
  // Running variations
  1: { name: 'Running', icon: Activity, color: 'text-orange-500' },
  206: { name: 'Running', icon: Activity, color: 'text-orange-500' },
  
  // Walking
  2: { name: 'Walking', icon: Footprints, color: 'text-green-500' },
  207: { name: 'Walking', icon: Footprints, color: 'text-green-500' },
  
  // Cycling
  3: { name: 'Cycling', icon: Bike, color: 'text-blue-500' },
  208: { name: 'Cycling', icon: Bike, color: 'text-blue-500' },
  
  // Gym/Strength
  4: { name: 'Gym Workout', icon: Dumbbell, color: 'text-purple-500' },
  228: { name: 'Strength Training', icon: Dumbbell, color: 'text-purple-500' },
  
  // Swimming
  5: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' },
  209: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' },
  
  // Hiking
  6: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' },
  210: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' },
  
  // Yoga/Flexibility
  7: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  211: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  
  // HIIT
  8: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  212: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  
  // Generic workout
  0: { name: 'Workout', icon: Target, color: 'text-gray-500' },
};

const getSportInfo = (sportType: number) => {
  return SPORT_TYPES[sportType] || SPORT_TYPES[0];
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
