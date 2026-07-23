import { Card } from '../common';
import { HrvTrendToggle } from './HrvTrendToggle';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface HrvTrendPoint {
  date: string;
  falconAvg: number | null;
  benchmarkAvg: number | null;
  benchmarkDeviceType: string | null;
}

interface HrvTrendChartProps {
  trend: HrvTrendPoint[];
  days: number;
  onDaysChange: (days: number) => void;
  title?: string;
}

/**
 * The Falcon-vs-benchmark multi-line HRV trend, with the 10/30-day toggle.
 * Shared by the tester overview and the admin user-summary view so both show
 * the identical chart.
 */
export function HrvTrendChart({ trend, days, onDaysChange, title = 'HRV Trend' }: HrvTrendChartProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <HrvTrendToggle days={days} onChange={onDaysChange} />
      </div>
      {trend.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Not enough data in this range yet</div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number | undefined, name: string | undefined) => [value != null ? `${value} ms` : 'N/A', name === 'falconAvg' ? 'Falcon' : 'Benchmark']}
              />
              <Legend formatter={(value) => (value === 'falconAvg' ? 'Falcon' : 'Benchmark')} />
              <Line type="monotone" dataKey="falconAvg" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="benchmarkAvg" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default HrvTrendChart;
