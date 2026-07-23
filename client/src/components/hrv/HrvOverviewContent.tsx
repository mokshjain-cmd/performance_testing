import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Moon, Gauge } from 'lucide-react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getHrvOverview, getHrvTrend } from '../../services/hrv.service';
import { HrvTrendChart } from './HrvTrendChart';
import type { HrvTrendPoint } from './HrvTrendChart';

interface RecentNight {
  sessionId: string;
  startTime: string;
  endTime: string;
  benchmarkDeviceType?: string | null;
  falconHrv?: number | null;
  benchmarkHrv?: number | null;
  meanBias?: number | null;
}

interface HrvOverview {
  totalNights: number;
  avgHrvOverall: number | null;
  overallAvgBias: number | null;
  recentNights: RecentNight[];
}

interface HrvOverviewContentProps {
  /**
   * When provided, clicking a night selects it in-place (dashboard mode)
   * instead of navigating to the standalone /hrv/session/:id route.
   */
  onSelectSession?: (sessionId: string) => void;
}

/**
 * Layout-free HRV overview (summary cards + latest nights + multi-line trend).
 * Rendered both by the standalone HrvOverviewPage and inside the shared
 * tester DashboardPage content area.
 */
export function HrvOverviewContent({ onSelectSession }: HrvOverviewContentProps) {
  const [overview, setOverview] = useState<HrvOverview | null>(null);
  const [trend, setTrend] = useState<HrvTrendPoint[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHrvOverview()
      .then(setOverview)
      .catch((err) => setError(err.message || 'Failed to load HRV overview'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getHrvTrend(days)
      .then(setTrend)
      .catch((err) => console.error('Failed to load HRV trend:', err));
  }, [days]);

  if (loading) return <Loader />;

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{error}</div>;
  }

  if (!overview || overview.totalNights === 0) {
    return (
      <div className="text-center py-12">
        <HeartPulse size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No HRV sessions recorded yet</p>
        <p className="text-gray-400 text-sm mt-2">Upload or manually enter a night's HRV data to see your stats here</p>
      </div>
    );
  }

  const renderNightLabel = (night: RecentNight) => (
    <>
      {new Date(night.startTime).toLocaleDateString()} {new Date(night.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
      {new Date(night.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <HeartPulse className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg HRV</p>
              <p className="text-2xl font-bold text-gray-900">{overview.avgHrvOverall != null ? `${overview.avgHrvOverall} ms` : '--'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Moon className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Nights</p>
              <p className="text-2xl font-bold text-gray-900">{overview.totalNights}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Gauge className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overall Avg Bias</p>
              <p className={`text-2xl font-bold ${overview.overallAvgBias == null ? 'text-gray-400' : overview.overallAvgBias >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {overview.overallAvgBias != null ? `${overview.overallAvgBias >= 0 ? '+' : ''}${overview.overallAvgBias} ms` : '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Latest 5 nights */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Latest 5 Nights</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Night</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Falcon HRV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benchmark HRV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mean Bias</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {overview.recentNights.map((night) => (
                <tr key={night.sessionId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {onSelectSession ? (
                      <button onClick={() => onSelectSession(night.sessionId)} className="text-indigo-600 hover:underline text-left">
                        {renderNightLabel(night)}
                      </button>
                    ) : (
                      <Link to={`/hrv/session/${night.sessionId}`} className="hover:underline">
                        {renderNightLabel(night)}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{night.falconHrv != null ? `${night.falconHrv} ms` : '--'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {night.benchmarkHrv != null ? `${night.benchmarkHrv} ms (${night.benchmarkDeviceType})` : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {night.meanBias != null ? (
                      <span className={night.meanBias >= 0 ? 'text-red-500' : 'text-blue-500'}>
                        {night.meanBias >= 0 ? '+' : ''}
                        {night.meanBias} ms
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Multi-line trend */}
      <HrvTrendChart trend={trend} days={days} onDaysChange={setDays} />
    </div>
  );
}

export default HrvOverviewContent;
