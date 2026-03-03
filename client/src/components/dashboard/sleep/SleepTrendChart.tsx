import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SleepTrendData } from '../../../types/sleep.types';

interface SleepTrendChartProps {
  data: SleepTrendData[];
  metrics: Array<'totalSleepTime' | 'deep' | 'rem' | 'light' | 'efficiency' | 'accuracy' | 'kappa'>;
  title?: string;
}

export const SleepTrendChart: React.FC<SleepTrendChartProps> = ({
  data,
  metrics,
  title,
}) => {
  // Transform data for display
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    totalSleepTime: (item.totalSleepTimeSec / 3600).toFixed(2),
    deep: (item.deepSec / 3600).toFixed(2),
    rem: (item.remSec / 3600).toFixed(2),
    light: (item.lightSec / 3600).toFixed(2),
    efficiency: item.sleepEfficiencyPercent?.toFixed(1),
    accuracy: item.accuracyPercent?.toFixed(1),
    kappa: item.kappaScore?.toFixed(2),
  }));

  const metricConfig = {
    totalSleepTime: { color: '#3b82f6', name: 'Total Sleep (hrs)', yAxisId: 'left' },
    deep: { color: '#1e40af', name: 'Deep (hrs)', yAxisId: 'left' },
    rem: { color: '#8b5cf6', name: 'REM (hrs)', yAxisId: 'left' },
    light: { color: '#60a5fa', name: 'Light (hrs)', yAxisId: 'left' },
    efficiency: { color: '#10b981', name: 'Efficiency (%)', yAxisId: 'right' },
    accuracy: { color: '#f59e0b', name: 'Accuracy (%)', yAxisId: 'right' },
    kappa: { color: '#ef4444', name: 'Kappa', yAxisId: 'right' },
  };

  const hasLeftMetrics = metrics.some((m) =>
    ['totalSleepTime', 'deep', 'rem', 'light'].includes(m)
  );
  const hasRightMetrics = metrics.some((m) =>
    ['efficiency', 'accuracy', 'kappa'].includes(m)
  );

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
            {hasLeftMetrics && (
              <YAxis
                yAxisId="left"
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
            )}
            {hasRightMetrics && (
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'Percent / Score', angle: 90, position: 'insideRight' }}
              />
            )}
            <Tooltip />
            <Legend />
            {metrics.map((metric) => {
              const config = metricConfig[metric];
              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={config.color}
                  strokeWidth={2}
                  name={config.name}
                  yAxisId={config.yAxisId}
                  dot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
