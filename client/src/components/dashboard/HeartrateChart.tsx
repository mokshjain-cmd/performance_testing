
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { splitDateTime } from '../../utils/dateTime';

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


  return (
    <div style={{ height: 400, width: "100%" }}>
      {/* Device toggles */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 12 }}>
        {deviceTypes.map((dt, idx) => (
          <label key={dt} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={visibleDevices.includes(dt)}
              onChange={() => handleToggle(dt)}
              style={{ accentColor: `hsl(${idx * 70}, 70%, 50%)` }}
            />
            <span style={{ color: `hsl(${idx * 70}, 70%, 50%)`, fontWeight: 500 }}>{dt}</span>
          </label>
        ))}
      </div>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            tickLine={false}
            tickFormatter={(ts) => splitDateTime(ts).time}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={[
              (dataMin: number) => dataMin - 5,
              (dataMax: number) => dataMax + 5
            ]}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #eee",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
            labelFormatter={(ts) => splitDateTime(ts).time}
          />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          {deviceTypes.map((dt, index) => (
            visibleDevices.includes(dt) && (
              <Line
                key={dt}
                type="monotone"
                dataKey={dt}
                strokeWidth={2}
                dot={{ r: 1 }}
                activeDot={{ r: 4 }}
                stroke={`hsl(${index * 70}, 70%, 50%)`}
              />
            )
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );


};

export default HeartRateChart;
