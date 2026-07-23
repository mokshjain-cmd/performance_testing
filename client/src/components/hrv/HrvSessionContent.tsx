import { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getHrvSession, getHrvReadings } from '../../services/hrv.service';
import { HrvChart } from './HrvChart';
import { HrChart } from './HrChart';
import type { HrvReadingPoint } from './HrvChart';

interface HrvChannelStats {
  lunaAvg?: number | null;
  benchmarkAvg?: number | null;
  mae?: number | null;
  rmse?: number | null;
  mape?: number | null;
  meanBias?: number | null;
}

interface HrvSessionData {
  session: {
    _id: string;
    name?: string;
    startTime: string;
    endTime: string;
    benchmarkDeviceType?: string;
  };
  hrvStats: {
    benchmarkDeviceType?: string;
    hrv?: HrvChannelStats;
    hr?: HrvChannelStats;
  } | null;
}

interface HrvSessionContentProps {
  sessionId: string | null;
  /** When true, renders a metadata header (name + time range). */
  showHeader?: boolean;
}

function StatCard({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value != null ? `${value}${unit}` : '--'}</p>
    </Card>
  );
}

function BiasCard({ label, value, unit }: { label: string; value: number | null | undefined; unit: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${value == null ? 'text-gray-400' : value >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
        {value != null ? `${value >= 0 ? '+' : ''}${value}${unit}` : '--'}
      </p>
    </Card>
  );
}

/**
 * Layout-free HRV session detail (HRV + HR sections with charts). Rendered by
 * the standalone HrvSessionPage and inside the shared tester DashboardPage.
 */
export function HrvSessionContent({ sessionId, showHeader = false }: HrvSessionContentProps) {
  const [data, setData] = useState<HrvSessionData | null>(null);
  const [readings, setReadings] = useState<{ luna: HrvReadingPoint[]; benchmark: HrvReadingPoint[] | null }>({
    luna: [],
    benchmark: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([getHrvSession(sessionId), getHrvReadings(sessionId)])
      .then(([sessionData, readingsData]) => {
        setData(sessionData);
        setReadings(readingsData);
      })
      .catch((err) => setError(err.message || 'Failed to load HRV session'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (!sessionId) {
    return <div className="text-center py-12 text-gray-500">Select a session from the list to view its HRV detail</div>;
  }

  if (loading) return <Loader />;

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{error || 'Session not found'}</div>
    );
  }

  const { session, hrvStats } = data;
  const benchmarkDeviceType = hrvStats?.benchmarkDeviceType || session.benchmarkDeviceType;
  const hrv = hrvStats?.hrv;
  const hr = hrvStats?.hr;

  return (
    <div className="space-y-8">
      {showHeader && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900">{session.name || 'HRV Session'}</h2>
          <p className="text-sm text-gray-500">
            {new Date(session.startTime).toLocaleString()} &rarr; {new Date(session.endTime).toLocaleTimeString()}
            {benchmarkDeviceType ? ` — vs ${benchmarkDeviceType}` : ''}
          </p>
        </Card>
      )}

      {/* HRV section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">HRV</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <StatCard label="Falcon Avg HRV" value={hrv?.lunaAvg} unit=" ms" />
          <StatCard label={`${benchmarkDeviceType || 'Benchmark'} Avg HRV`} value={hrv?.benchmarkAvg} unit=" ms" />
          <BiasCard label="Mean Bias" value={hrv?.meanBias} unit=" ms" />
        </div>
        <HrvChart
          lunaReadings={readings.luna}
          benchmarkReadings={readings.benchmark}
          benchmarkDeviceType={benchmarkDeviceType}
          meanBias={hrv?.meanBias}
        />
      </div>

      {/* HR section — session-page only, never rolled up into overview/admin views */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Sleep Heart Rate</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatCard label="Falcon Avg HR" value={hr?.lunaAvg} unit=" bpm" />
          <StatCard label={`${benchmarkDeviceType || 'Benchmark'} Avg HR`} value={hr?.benchmarkAvg} unit=" bpm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <StatCard label="MAE" value={hr?.mae} unit=" bpm" />
          <BiasCard label="Mean Bias" value={hr?.meanBias} unit=" bpm" />
          <StatCard label="RMSE" value={hr?.rmse} unit=" bpm" />
          <StatCard label="MAPE" value={hr?.mape} unit="%" />
        </div>
        <HrChart
          lunaReadings={readings.luna}
          benchmarkReadings={readings.benchmark}
          benchmarkDeviceType={benchmarkDeviceType}
          meanBias={hr?.meanBias}
        />
      </div>
    </div>
  );
}

export default HrvSessionContent;
