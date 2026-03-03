import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SleepArchitectureChartProps {
  deep: number;
  light: number;
  rem: number;
  awake: number;
}

const COLORS = {
  deep: '#1e40af',
  light: '#3b82f6',
  rem: '#8b5cf6',
  awake: '#ef4444',
};

export const SleepArchitectureChart: React.FC<SleepArchitectureChartProps> = ({
  deep,
  light,
  rem,
  awake,
}) => {
  const total = deep + light + rem + awake;

  const data = [
    { name: 'Deep', value: deep, percent: ((deep / total) * 100).toFixed(1) },
    { name: 'Light', value: light, percent: ((light / total) * 100).toFixed(1) },
    { name: 'REM', value: rem, percent: ((rem / total) * 100).toFixed(1) },
    { name: 'Awake', value: awake, percent: ((awake / total) * 100).toFixed(1) },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const hours = (payload[0].value / 3600).toFixed(2);
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p>{hours} hours</p>
          <p>{payload[0].payload.percent}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${percent}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
