import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StageDurationChartProps {
  lunaData: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
  benchmarkData?: {
    deep: number;
    light: number;
    rem: number;
    awake: number;
  };
  showComparison?: boolean;
}

export const StageDurationChart: React.FC<StageDurationChartProps> = ({
  lunaData,
  benchmarkData,
  showComparison = false,
}) => {
  // Convert seconds to hours
  const toHours = (sec: number) => (sec / 3600).toFixed(2);

  const data = [
    {
      stage: 'Deep',
      Luna: parseFloat(toHours(lunaData.deep)),
      Benchmark: benchmarkData ? parseFloat(toHours(benchmarkData.deep)) : 0,
    },
    {
      stage: 'Light',
      Luna: parseFloat(toHours(lunaData.light)),
      Benchmark: benchmarkData ? parseFloat(toHours(benchmarkData.light)) : 0,
    },
    {
      stage: 'REM',
      Luna: parseFloat(toHours(lunaData.rem)),
      Benchmark: benchmarkData ? parseFloat(toHours(benchmarkData.rem)) : 0,
    },
    {
      stage: 'Awake',
      Luna: parseFloat(toHours(lunaData.awake)),
      Benchmark: benchmarkData ? parseFloat(toHours(benchmarkData.awake)) : 0,
    },
  ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => value ? `${value} hrs` : ''} />
          <Legend />
          <Bar dataKey="Luna" fill="#3b82f6" />
          {showComparison && benchmarkData && (
            <Bar dataKey="Benchmark" fill="#10b981" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
