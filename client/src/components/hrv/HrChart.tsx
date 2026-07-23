import React, { useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart, Line } from 'recharts';
import type { HrvReadingPoint } from './HrvChart';
import { capValue, computeOverlapWindowMs, restrictToWindow } from './hrvChartUtils';

interface HrChartProps {
  lunaReadings: HrvReadingPoint[];
  benchmarkReadings?: HrvReadingPoint[] | null;
  benchmarkDeviceType?: string;
  meanBias?: number | null;
}

const formatClockTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/**
 * The per-night HR channel from the same HRV session — shown only here, on the
 * session detail page. Never fed into any overview/admin aggregate (see
 * HrvAnalysisService: HR stays confined to hrvStats.hr, never pairwiseComparisons).
 */
export const HrChart: React.FC<HrChartProps> = ({ lunaReadings, benchmarkReadings, benchmarkDeviceType, meanBias }) => {
  const overlapWindow = useMemo(
    () => computeOverlapWindowMs(lunaReadings, benchmarkReadings, 'hr'),
    [lunaReadings, benchmarkReadings]
  );
  const visibleLuna = useMemo(() => restrictToWindow(lunaReadings, overlapWindow), [lunaReadings, overlapWindow]);
  const visibleBenchmark = useMemo(
    () => restrictToWindow(benchmarkReadings || [], overlapWindow),
    [benchmarkReadings, overlapWindow]
  );

  const benchmarkMap = useMemo(() => {
    const map = new Map<number, number>();
    visibleBenchmark.forEach((r) => {
      const v = capValue('hr', r.hr);
      if (v != null) map.set(new Date(r.timestamp).getTime(), v);
    });
    return map;
  }, [visibleBenchmark]);

  const chartData = useMemo(
    () =>
      visibleLuna.map((r) => ({
        time: formatClockTime(r.timestamp),
        hr: capValue('hr', r.hr),
        benchmarkHr: benchmarkMap.get(new Date(r.timestamp).getTime()) ?? null,
      })),
    [visibleLuna, benchmarkMap]
  );

  if (!lunaReadings || lunaReadings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Sleep HR Timeline</h3>
        <div className="text-center py-12 text-gray-500">No HR readings available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Sleep HR Timeline</h3>
        {overlapWindow && (
          <span className="text-xs text-gray-400">
            Showing overlapping window only ({visibleLuna.length} pts)
          </span>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No overlapping window between Falcon and the benchmark for this session
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" stroke="#9CA3AF" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={20} angle={-30} textAnchor="end" />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'BPM', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9CA3AF' } }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value == null) return ['N/A', name || ''];
                  if (name === 'hr') return [`${value} BPM`, 'Falcon HR'];
                  if (name === 'benchmarkHr') return [`${value} BPM`, `${benchmarkDeviceType || 'Benchmark'} HR`];
                  return [value, name || ''];
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />

              {meanBias != null && (
                <ReferenceLine
                  y={0}
                  stroke="#a1a1aa"
                  strokeDasharray="3 3"
                  label={{ value: `Mean bias ${meanBias > 0 ? '+' : ''}${meanBias}`, position: 'right', fontSize: 10, fill: '#71717a' }}
                />
              )}

              <Line type="monotone" dataKey="hr" stroke="#EF4444" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#EF4444' }} name="hr" />
              {visibleBenchmark.length > 0 && (
                <Line type="monotone" dataKey="benchmarkHr" stroke="#10B981" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#10B981' }} name="benchmarkHr" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-8 h-0.5 bg-red-500 rounded" />
          <span>Falcon HR</span>
        </div>
        {visibleBenchmark.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span>{benchmarkDeviceType || 'Benchmark'} HR</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrChart;
