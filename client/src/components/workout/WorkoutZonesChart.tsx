import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WorkoutZonesChartProps {
  zones: {
    warmUp: number;
    fatBurning: number;
    aerobic: number;
    anaerobic: number;
  };
}

const ZONE_CONFIG = [
  { key: 'warmUp', label: 'Warm Up', color: '#9CA3AF', description: '50-60% Max HR' },
  { key: 'fatBurning', label: 'Fat Burning', color: '#3B82F6', description: '60-70% Max HR' },
  { key: 'aerobic', label: 'Aerobic', color: '#22C55E', description: '70-80% Max HR' },
  { key: 'anaerobic', label: 'Anaerobic', color: '#F59E0B', description: '80-90% Max HR' },
];

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
};

export const WorkoutZonesChart: React.FC<WorkoutZonesChartProps> = ({ zones }) => {
  const data = ZONE_CONFIG.map(zone => ({
    name: zone.label,
    value: zones[zone.key as keyof typeof zones] || 0,
    color: zone.color,
    description: zone.description,
  }));

  const totalTime = data.reduce((sum, d) => sum + d.value, 0);

  // If no zone data, show empty state
  if (totalTime === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">HR Zones</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No HR zone data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">HR Zones</h3>
      
      {/* Horizontal Bar Chart */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              tickFormatter={(value) => formatTime(value)}
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              stroke="#9CA3AF"
              fontSize={12}
              width={75}
            />
            <Tooltip
              formatter={(value: number | undefined) => [value !== undefined ? formatTime(value) : 'N/A', 'Duration']}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Zone Legend */}
      <div className="grid grid-cols-2 gap-3">
        {data.map((zone) => (
          <div 
            key={zone.name}
            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: zone.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-700 truncate">
                  {zone.name}
                </span>
                <span className="text-xs font-semibold text-gray-900 ml-2">
                  {formatTime(zone.value)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500">{zone.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Total Time */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
        <span className="text-sm text-gray-600">Total Time in Zones</span>
        <span className="text-sm font-bold text-gray-900">{formatTime(totalTime)}</span>
      </div>
    </div>
  );
};

export default WorkoutZonesChart;
