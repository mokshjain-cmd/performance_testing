import { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getAdminUserHrvSummary, getAdminUserHrvTrend } from '../../services/hrv.service';
import { HrvTrendChart } from '../hrv/HrvTrendChart';
import type { HrvTrendPoint } from '../hrv/HrvTrendChart';
import { HeartPulse, Moon, Gauge } from 'lucide-react';

interface RecentNight {
  sessionId: string;
  startTime: string;
  endTime: string;
  benchmarkDeviceType?: string | null;
  falconHrv?: number | null;
  benchmarkHrv?: number | null;
  meanBias?: number | null;
}

interface UserHrvData {
  totalNights: number;
  avgHrvOverall: number | null;
  overallAvgBias: number | null;
  recentNights: RecentNight[];
}

interface AdminHrvUserViewProps {
  userId: string;
}

export default function AdminHrvUserView({ userId }: AdminHrvUserViewProps) {
  const [data, setData] = useState<UserHrvData | null>(null);
  const [trend, setTrend] = useState<HrvTrendPoint[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    getAdminUserHrvSummary(userId)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load user HRV data'))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    getAdminUserHrvTrend(userId, days)
      .then(setTrend)
      .catch((err) => console.error('Failed to load user HRV trend:', err));
  }, [userId, days]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.totalNights === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No HRV data found for this user</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">HRV Performance</h2>
            <p className="text-sm text-gray-500">User: {userId}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <HeartPulse className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg HRV</p>
              <p className="text-2xl font-bold text-gray-900">{data.avgHrvOverall != null ? `${data.avgHrvOverall} ms` : '--'}</p>
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
              <p className="text-2xl font-bold text-gray-900">{data.totalNights}</p>
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
              <p className={`text-2xl font-bold ${data.overallAvgBias == null ? 'text-gray-400' : data.overallAvgBias >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
                {data.overallAvgBias != null ? `${data.overallAvgBias >= 0 ? '+' : ''}${data.overallAvgBias} ms` : '--'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {data.recentNights && data.recentNights.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Latest Nights</h3>
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
                {data.recentNights.map((night) => (
                  <tr key={night.sessionId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(night.startTime).toLocaleDateString()}{' '}
                      {new Date(night.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                      {new Date(night.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      )}

      {/* Multi-line Falcon-vs-benchmark trend, same chart as the tester dashboard */}
      <HrvTrendChart trend={trend} days={days} onDaysChange={setDays} />
    </div>
  );
}
