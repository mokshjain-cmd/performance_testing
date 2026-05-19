import React from 'react';
import { 
  Heart, 
  Timer, 
  Flame, 
  Footprints, 
  Gauge, 
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import type { WorkoutStats } from '../../types';

interface WorkoutStatsCardProps {
  stats: WorkoutStats;
}

const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m ${secs}s`;
};

const formatPace = (pace: number): string => {
  if (!pace || pace <= 0) return '--';

  return `${(pace / 60).toFixed(1)} /km`;
};
const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

export const WorkoutStatsCard: React.FC<WorkoutStatsCardProps> = ({ stats }) => {
  const statItems = [
    {
      icon: Timer,
      label: 'Duration',
      value: formatDuration(stats.durationSec),
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Heart,
      label: 'Avg HR',
      value: `${stats.hr?.avg || '--'} BPM`,
      subValue: `Max: ${stats.hr?.max || '--'}, Min: ${stats.hr?.min || '--'}`,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      icon: Flame,
      label: 'Calories',
      value: `${stats.calories || 0}`,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Footprints,
      label: 'Steps',
      value: stats.steps?.toLocaleString() || '0',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: TrendingUp,
      label: 'Distance',
      value: formatDistance(stats.distance || 0),
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Gauge,
      label: 'Avg Pace',
      value: formatPace(stats.pace?.avg),
      subValue: stats.pace?.fast ? `Best: ${formatPace(stats.pace.fast)}` : undefined,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50',
    },
  ];

  const trainingMetrics = [
    {
      label: 'Training Effect',
      value: stats.trainingEffect?.toFixed(1) || '--',
      description: 'Aerobic benefit score (1-5)',
      icon: Activity,
    },
    {
      label: 'Training Load',
      value: stats.trainingLoad?.toFixed(0) || '--',
      description: 'Workout intensity score',
      icon: Zap,
    },
    {
      label: 'Est. VO2 Max',
      value: stats.vo2max ? `${stats.vo2max.toFixed(1)}` : '--',
      description: 'ml/kg/min',
      icon: TrendingUp,
    },
    {
      label: 'Recovery Time',
      value: stats.recoveryTime ? `${Math.round(stats.recoveryTime / 3600)}h` : '--',
      description: 'Recommended rest',
      icon: Timer,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Workout Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.label}
                className={`${item.bgColor} rounded-lg p-4 transition-all hover:shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={18} className={item.color} />
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{item.value}</div>
                {item.subValue && (
                  <div className="text-xs text-gray-500 mt-0.5">{item.subValue}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Training Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Training Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trainingMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div 
                key={metric.label}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <Icon size={20} className="mx-auto mb-2 text-gray-400" />
                <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                <div className="text-xs font-medium text-gray-700 mt-1">{metric.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{metric.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WorkoutStatsCard;
