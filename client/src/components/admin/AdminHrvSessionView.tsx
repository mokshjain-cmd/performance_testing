import { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getHrvSession, getHrvReadings } from '../../services/hrv.service';
import { HrvChart } from '../hrv/HrvChart';
import { HrChart } from '../hrv/HrChart';
import type { HrvReadingPoint } from '../hrv/HrvChart';

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

interface AdminHrvSessionViewProps {
  sessionId: string;
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

export default function AdminHrvSessionView({ sessionId }: AdminHrvSessionViewProps) {
  const [data, setData] = useState<HrvSessionData | null>(null);
  const [readings, setReadings] = useState<{ luna: HrvReadingPoint[]; benchmark: HrvReadingPoint[] | null }>({
    luna: [],
    benchmark: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
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

  if (loading) return <Loader />;

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'HRV session not found'}</p>
      </div>
    );
  }

  const { session, hrvStats } = data;
  const benchmarkDeviceType = hrvStats?.benchmarkDeviceType || session.benchmarkDeviceType;
  const hrv = hrvStats?.hrv;
  const hr = hrvStats?.hr;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{session.name || 'HRV Session'}</h2>
            <p className="text-sm text-gray-500">
              {new Date(session.startTime).toLocaleString()} &rarr; {new Date(session.endTime).toLocaleTimeString()}
              {benchmarkDeviceType ? ` — vs ${benchmarkDeviceType}` : ''}
            </p>
          </div>
        </div>
      </Card>

      {/* HRV section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">HRV</h3>
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

      {/* HR section — session-page only, never rolled up into overview/admin aggregates */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Sleep Heart Rate</h3>
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
