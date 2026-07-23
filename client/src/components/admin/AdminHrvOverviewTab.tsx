import { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getAdminHrvGlobalSummary, getAdminHrvDailyTrend } from '../../services/hrv.service';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { SubTab } from './SubTabBar';
import AdminHrvBenchmarkTab from './AdminHrvBenchmarkTab';
import AdminHrvFirmwareTab from './AdminHrvFirmwareTab';

interface GlobalSummary {
  totalSessions: number;
  totalUsers: number;
  lunaStats?: { avgBias?: number };
  computedAt: string;
}

interface DailyTrendPoint {
  date: string;
  lunaStats?: { avgBias?: number };
}

interface AdminHrvOverviewTabProps {
  subTab: SubTab;
}

export default function AdminHrvOverviewTab({ subTab }: AdminHrvOverviewTabProps) {
  const [summary, setSummary] = useState<GlobalSummary | null>(null);
  const [trend, setTrend] = useState<DailyTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subTab !== 'overview') return;
    setLoading(true);
    Promise.all([getAdminHrvGlobalSummary(), getAdminHrvDailyTrend(30)])
      .then(([summaryData, trendData]) => {
        setSummary(summaryData);
        setTrend(trendData || []);
      })
      .finally(() => setLoading(false));
  }, [subTab]);

  if (subTab === 'benchmark') {
    return <AdminHrvBenchmarkTab />;
  }

  if (subTab === 'firmware') {
    return <AdminHrvFirmwareTab />;
  }

  if (loading) return <Loader />;

  const chartData = trend.map((t) => ({
    date: new Date(t.date).toLocaleDateString(),
    avgBias: t.lunaStats?.avgBias ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total HRV Sessions</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalSessions ?? '--'}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Avg Bias Across Users</p>
          <p className={`text-2xl font-bold ${summary?.lunaStats?.avgBias == null ? 'text-gray-400' : summary.lunaStats.avgBias >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {summary?.lunaStats?.avgBias != null ? `${summary.lunaStats.avgBias >= 0 ? '+' : ''}${summary.lunaStats.avgBias.toFixed(1)} ms` : '--'}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Last Updated</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.computedAt ? new Date(summary.computedAt).toLocaleDateString() : '--'}</p>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Avg Bias Across Users (Last 30 Days)</h3>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} label={{ value: 'ms', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                <Tooltip formatter={(value: number | undefined) => [value != null ? `${value} ms` : 'N/A', 'Avg Bias']} />
                <Line type="monotone" dataKey="avgBias" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
