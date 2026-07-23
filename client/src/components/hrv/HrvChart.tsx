import React, { useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart, Line } from 'recharts';
import { capValue, computeOverlapWindowMs, restrictToWindow } from './hrvChartUtils';

export interface HrvReadingPoint {
  timestamp: string;
  hrv?: number | null;
  hr?: number | null;
}

interface HrvChartProps {
  lunaReadings: HrvReadingPoint[];
  benchmarkReadings?: HrvReadingPoint[] | null;
  benchmarkDeviceType?: string;
  meanBias?: number | null;
}

const formatClockTime = (timestamp: string): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const HrvChart: React.FC<HrvChartProps> = ({ lunaReadings, benchmarkReadings, benchmarkDeviceType, meanBias }) => {
  // Restrict to the overlapping window (Falcon usually runs the whole night,
  // the benchmark is a shorter spot-check) and drop physiologically
  // implausible artefacts — matches playground/plot_hrv.js's methodology, so
  // this chart only ever shows the portion that's actually comparable.
  const overlapWindow = useMemo(
    () => computeOverlapWindowMs(lunaReadings, benchmarkReadings, 'hrv'),
    [lunaReadings, benchmarkReadings]
  );
  const visibleLuna = useMemo(() => restrictToWindow(lunaReadings, overlapWindow), [lunaReadings, overlapWindow]);
  const visibleBenchmark = useMemo(
    () => restrictToWindow(benchmarkReadings || [], overlapWindow),
    [benchmarkReadings, overlapWindow]
  );

  // Both series are already aligned to the same midnight-anchored 30s grid, so
  // readings can be joined directly by their exact timestamp (ms) — no offset
  // alignment needed, unlike Workout's per-second HR chart.
  const benchmarkMap = useMemo(() => {
    const map = new Map<number, number>();
    visibleBenchmark.forEach((r) => {
      const v = capValue('hrv', r.hrv);
      if (v != null) map.set(new Date(r.timestamp).getTime(), v);
    });
    return map;
  }, [visibleBenchmark]);

  const chartData = useMemo(
    () =>
      visibleLuna.map((r) => ({
        time: formatClockTime(r.timestamp),
        hrv: capValue('hrv', r.hrv),
        benchmarkHrv: benchmarkMap.get(new Date(r.timestamp).getTime()) ?? null,
      })),
    [visibleLuna, benchmarkMap]
  );

  if (!lunaReadings || lunaReadings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">HRV Timeline</h3>
        <div className="text-center py-12 text-gray-500">No HRV readings available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">HRV Timeline</h3>
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
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9CA3AF' } }} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value == null) return ['N/A', name || ''];
                  if (name === 'hrv') return [`${value} ms`, 'Falcon HRV'];
                  if (name === 'benchmarkHrv') return [`${value} ms`, `${benchmarkDeviceType || 'Benchmark'} HRV`];
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

              {/* connectNulls intentionally omitted — a capped/missing point should
                  show as a true gap in the line, not be bridged over. */}
              <Line type="monotone" dataKey="hrv" stroke="#6366F1" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#6366F1' }} name="hrv" />
              {visibleBenchmark.length > 0 && (
                <Line type="monotone" dataKey="benchmarkHrv" stroke="#10B981" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#10B981' }} name="benchmarkHrv" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className="w-8 h-0.5 bg-indigo-500 rounded" />
          <span>Falcon HRV</span>
        </div>
        {visibleBenchmark.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span>{benchmarkDeviceType || 'Benchmark'} HRV</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrvChart;
