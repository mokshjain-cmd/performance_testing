
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { splitDateTime } from '../../utils/dateTime';
import { HeartPulse } from 'lucide-react';
import type { Analysis } from '../../types';

interface Props {
  points: Record<string, any[]>;
  analysis?: Analysis;
}


const HeartRateChart: React.FC<Props> = ({ points, analysis }) => {
    console.log("HeartRateChart received points:", points);
  const deviceTypes = Object.keys(points);
  console.log("Device Types:", deviceTypes);
  const [visibleDevices, setVisibleDevices] = useState<string[]>(deviceTypes);

  const handleToggle = (dt: string) => {
    setVisibleDevices(prev =>
      prev.includes(dt) ? prev.filter(d => d !== dt) : [...prev, dt]
    );
  };

  const timestamps = Array.from(
    new Set(deviceTypes.flatMap(dt => points[dt].map(p => p.timestamp)))
  ).sort();

  const chartData = timestamps.map(ts => {
    const row: any = { timestamp: ts };
    deviceTypes.forEach(dt => {
      row[dt] = points[dt].find(p => p.timestamp === ts)?.metrics.heartRate ?? null;
    });
    return row;
  });

  // Colors for different devices
  const getDeviceColor = (index: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-xl font-semibold text-gray-800 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-500" />
            Heart Rate Timeline
        </h2>

      {/* Device Statistics - All Devices */}
      {analysis?.deviceStats && analysis.deviceStats.length > 0 && (
        <div className="mb-3">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Device Statistics</h3>
          <div className="space-y-2">
            {analysis.deviceStats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Device Name and Version */}
                  <div className="flex items-center gap-2 min-w-fit">
                    <span className="font-semibold text-gray-800 text-base">{stat.deviceType}</span>
                    <span className="text-xs bg-indigo-100 px-2 py-0.5 rounded-full text-indigo-700 font-medium">
                      {stat.firmwareVersion}
                    </span>
                  </div>
                  
                  {/* Stats spread across full width */}
                  <div className="flex items-center justify-between flex-1 gap-4 text-sm">
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Min</span>
                      <span className="font-semibold text-gray-800">{stat.hr.min.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Max</span>
                      <span className="font-semibold text-gray-800">{stat.hr.max.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Avg</span>
                      <span className="font-semibold text-gray-800">{stat.hr.avg.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Median</span>
                      <span className="font-semibold text-gray-800">{stat.hr.median.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Std Dev</span>
                      <span className="font-semibold text-gray-800">{stat.hr.stdDev.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-gray-600 text-xs">Range</span>
                      <span className="font-semibold text-gray-800">{stat.hr.range.toFixed(1)} <span className="text-xs text-gray-500">BPM</span></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              stroke="#9ca3af"
              tickFormatter={(ts) => splitDateTime(ts).time}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={false}
              axisLine={false}
              stroke="#9ca3af"
              domain={[
                (dataMin: number) => dataMin - 5,
                (dataMax: number) => dataMax + 5
              ]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
              labelFormatter={(ts) => splitDateTime(ts).time}
              formatter={(value: any) => {
                if (typeof value === 'number') {
                  return value.toFixed(2);
                }
                return value;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: 20 }} 
              iconType="line"
            />
            {deviceTypes.map((dt, index) => (
              visibleDevices.includes(dt) && (
                <Line
                  key={dt}
                  type="monotone"
                  dataKey={dt}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                  stroke={getDeviceColor(index)}
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Device toggles - Moved below graph */}
      <div className="mt-3 flex flex-wrap gap-2">
        {deviceTypes.map((dt, idx) => {
          const color = getDeviceColor(idx);
          const isVisible = visibleDevices.includes(dt);
          
          return (
            <label 
              key={dt} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                isVisible 
                  ? 'bg-opacity-10 shadow-sm' 
                  : 'bg-gray-50 opacity-60'
              }`}
              style={{ 
                borderColor: isVisible ? color : '#e5e7eb',
                backgroundColor: isVisible ? `${color}15` : undefined 
              }}
            >
              <input
                type="checkbox"
                checked={isVisible}
                onChange={() => handleToggle(dt)}
                className="w-4 h-4"
                style={{ accentColor: color }}
              />
              <span 
                className="font-medium text-sm"
                style={{ color: isVisible ? color : '#6b7280' }}
              >
                {dt}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );


};

export default HeartRateChart;
