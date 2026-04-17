import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import type { WorkoutReading } from '../../types';

interface WorkoutHRChartProps {
  readings: WorkoutReading[];
  benchmarkReadings?: WorkoutReading[] | null;
  benchmarkDeviceType?: string;
  avgHr?: number;
  maxHr?: number;
  showIntensity?: boolean;
}

const formatTime = (timestamp: string, startTime: string): string => {
  const start = new Date(startTime).getTime();
  const current = new Date(timestamp).getTime();
  const diffSec = Math.floor((current - start) / 1000);
  
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hrs}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const WorkoutHRChart: React.FC<WorkoutHRChartProps> = ({ 
  readings, 
  benchmarkReadings,
  benchmarkDeviceType,
  avgHr,
  maxHr,
  showIntensity = false
}) => {
  // Create a map for benchmark readings by time offset in seconds
  const benchmarkMap = useMemo(() => {
    const map = new Map<number, number>();
    if (benchmarkReadings && benchmarkReadings.length > 0 && readings.length > 0) {
      const lunaStart = new Date(readings[0].timestamp).getTime();
      const benchmarkStart = new Date(benchmarkReadings[0].timestamp).getTime();
      
      benchmarkReadings.forEach(r => {
        // Calculate offset from benchmark start
        const benchmarkTimeMs = new Date(r.timestamp).getTime();
        // Map to luna timeline: find the equivalent second in luna timeline
        const offsetFromBenchmarkStart = Math.floor((benchmarkTimeMs - benchmarkStart) / 1000);
        map.set(offsetFromBenchmarkStart, r.heartRate);
      });
    }
    return map;
  }, [benchmarkReadings, readings]);

  const chartData = useMemo(() => {
    if (!readings || readings.length === 0) return [];
    
    const startTime = readings[0].timestamp;
    
    // Prepare data with relative time - show ALL readings (no downsampling)
    const data = readings.map((reading, index) => ({
      index,
      time: formatTime(reading.timestamp, startTime),
      timestamp: reading.timestamp,
      heartRate: reading.heartRate,
      benchmarkHr: benchmarkMap.get(index) ?? null,
      confidence: reading.heartRateConfidence,
      intensity: reading.exerciseIntensity,
    }));
    
    return data;
  }, [readings, benchmarkMap]);

  if (!readings || readings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Heart Rate Timeline</h3>
        <div className="text-center py-12 text-gray-500">
          <p>No HR readings available</p>
        </div>
      </div>
    );
  }

  const hrValues = readings.map(r => r.heartRate).filter(Boolean);
  const minHrValue = Math.min(...hrValues);
  const maxHrValue = Math.max(...hrValues);
  const yDomain = [
    Math.max(0, minHrValue - 10),
    maxHrValue + 10
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Heart Rate Timeline</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">
            {readings.length.toLocaleString()} readings
          </span>
        </div>
      </div>

      {/* Stats summary */}
      <div className="flex gap-6 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Max: <strong>{maxHrValue} BPM</strong></span>
        </div>
        {avgHr && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Avg: <strong>{avgHr.toFixed(0)} BPM</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600">Min: <strong>{minHrValue} BPM</strong></span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="time" 
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
              tickCount={8}
            />
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              domain={yDomain}
              label={{ 
                value: 'BPM', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#9CA3AF' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'heartRate') return [`${value.toFixed(0)} BPM`, 'Falcon HR'];
                if (name === 'benchmarkHr') return [`${value.toFixed(0)} BPM`, `${benchmarkDeviceType || 'Benchmark'} HR`];
                if (name === 'intensity') return [`${value}%`, 'Intensity'];
                return [value, name];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            
            {/* Average HR reference line */}
            {avgHr && (
              <ReferenceLine 
                y={avgHr} 
                stroke="#3B82F6" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Avg ${avgHr.toFixed(0)}`, 
                  position: 'right',
                  fontSize: 10,
                  fill: '#3B82F6'
                }}
              />
            )}

            {/* Falcon HR Line */}
            <Line
              type="monotone"
              dataKey="heartRate"
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4, fill: '#EF4444' }}
              name="heartRate"
            />

            {/* Benchmark HR Line */}
            {benchmarkReadings && benchmarkReadings.length > 0 && (
              <Line
                type="monotone"
                dataKey="benchmarkHr"
                stroke="#10B981"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, fill: '#10B981' }}
                connectNulls
                name="benchmarkHr"
              />
            )}

            {/* Intensity area (if enabled) */}
            {showIntensity && (
              <Area
                type="monotone"
                dataKey="intensity"
                fill="#8B5CF6"
                fillOpacity={0.1}
                stroke="#8B5CF6"
                strokeWidth={0}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-8 h-0.5 bg-red-500 rounded" />
          <span>Falcon HR</span>
        </div>
        {benchmarkReadings && benchmarkReadings.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span>{benchmarkDeviceType || 'Benchmark'} HR</span>
          </div>
        )}
        {avgHr && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-8 h-0.5 bg-blue-500 rounded" style={{ 
              background: 'repeating-linear-gradient(90deg, #3B82F6, #3B82F6 4px, transparent 4px, transparent 8px)' 
            }} />
            <span>Average</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutHRChart;
