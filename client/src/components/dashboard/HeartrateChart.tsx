
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { splitDateTime } from '../../utils/dateTime';
import { HeartPulse } from 'lucide-react';
import type { Analysis } from '../../types';

interface Props {
  points: Record<string, any[]>;
  analysis?: Analysis;
  metric?: string;
}


const HeartRateChart: React.FC<Props> = ({ points, analysis, metric = 'HR' }) => {
  const deviceTypes = Object.keys(points);
  const [visibleDevices, setVisibleDevices] = useState<string[]>(deviceTypes);

  const handleToggle = (dt: string) => {
    setVisibleDevices(prev =>
      prev.includes(dt) ? prev.filter(d => d !== dt) : [...prev, dt]
    );
  };

  const timestamps = Array.from(
    new Set(deviceTypes.flatMap(dt => points[dt].map(p => p.timestamp)))
  ).sort();

  // Get metric field name and details
  const getMetricField = (m: string) => {
    switch (m) {
      case 'HR': return 'heartRate';
      case 'SPO2': return 'spo2';
      case 'Sleep': return 'sleep';
      case 'Calories': return 'calories';
      case 'Steps': return 'steps';
      default: return 'heartRate';
    }
  };

  const getMetricLabel = (m: string) => {
    switch (m) {
      case 'HR': return 'Heart Rate';
      case 'SPO2': return 'Blood Oxygen (SPO2)';
      case 'Sleep': return 'Sleep';
      case 'Calories': return 'Calories';
      case 'Steps': return 'Steps';
      default: return 'Heart Rate';
    }
  };

  const getMetricUnit = (m: string) => {
    switch (m) {
      case 'HR': return 'BPM';
      case 'SPO2': return '%';
      case 'Sleep': return 'score';
      case 'Calories': return 'kcal';
      case 'Steps': return 'steps';
      default: return 'BPM';
    }
  };

  const metricField = getMetricField(metric);
  const metricLabel = getMetricLabel(metric);
  const metricUnit = getMetricUnit(metric);
  const metricKey = metric.toLowerCase();

  const chartData = timestamps.map(ts => {
    const row: any = { timestamp: ts };
    deviceTypes.forEach(dt => {
      const point = points[dt].find(p => p.timestamp === ts);
      row[dt] = point?.metrics?.[metricField] ?? null;
    });
    return row;
  });

  // Check if all metric values are null
  const hasValidData = chartData.some(row => 
    deviceTypes.some(dt => row[dt] !== null && row[dt] !== undefined)
  );

  // Get valid values for domain calculation
  const allValidValues = chartData.flatMap(row => 
    deviceTypes.map(dt => row[dt]).filter(v => v !== null && v !== undefined)
  );

  // Colors for different devices
  const getDeviceColor = (index: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-xl font-semibold text-gray-800 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-500" />
            {metricLabel} Timeline
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
                    {(() => {
                      const statData = (stat as any)[metricKey];
                      if (!statData) {
                        return (
                          <div className="text-sm text-gray-500 italic">
                            No valid {metricLabel} data available
                          </div>
                        );
                      }
                      return (
                        <>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Min</span>
                            <span className="font-semibold text-gray-800">{statData.min != null ? statData.min.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Max</span>
                            <span className="font-semibold text-gray-800">{statData.max != null ? statData.max.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Avg</span>
                            <span className="font-semibold text-gray-800">{statData.avg != null ? statData.avg.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Median</span>
                            <span className="font-semibold text-gray-800">{statData.median != null ? statData.median.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Std Dev</span>
                            <span className="font-semibold text-gray-800">{statData.stdDev != null ? statData.stdDev.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-gray-600 text-xs">Range</span>
                            <span className="font-semibold text-gray-800">{statData.range != null ? statData.range.toFixed(1) : '--'} <span className="text-xs text-gray-500">{metricUnit}</span></span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show message if no valid data */}
      {!hasValidData ? (
        <div className="h-[400px] flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-2">No valid {metricLabel} data available</p>
            <p className="text-gray-400 text-sm">All metric values are null or undefined for this session</p>
          </div>
        </div>
      ) : (
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
                domain={allValidValues.length > 0 ? [
                  (dataMin: number) => Math.max(0, dataMin - 5),
                  (dataMax: number) => dataMax + 5
                ] : [0, 100]}
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
      )}

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
