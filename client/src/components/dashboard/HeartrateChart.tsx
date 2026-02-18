
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { splitDateTime } from '../../utils/dateTime';
import { HeartPulse } from 'lucide-react';

interface Props {
  points: Record<string, any[]>;
}


const HeartRateChart: React.FC<Props> = ({ points }) => {
    console.log("🔥 HeartRateChart received points:", points);
  const deviceTypes = Object.keys(points);
  console.log("📱 Device Types:", deviceTypes);
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
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
        <h2 className="mb-6 text-2xl font-semibold text-gray-800 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-500" />
            Heart Rate Timeline
        </h2>

      {/* Device toggles */}
      <div className="mb-6 flex flex-wrap gap-3">
        {deviceTypes.map((dt, idx) => {
          const color = getDeviceColor(idx);
          const isVisible = visibleDevices.includes(dt);
          
          return (
            <label 
              key={dt} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                isVisible 
                  ? 'bg-opacity-10 shadow-md' 
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
    </div>
  );


};

export default HeartRateChart;
