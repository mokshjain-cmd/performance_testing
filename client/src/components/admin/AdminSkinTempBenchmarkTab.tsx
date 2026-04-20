import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';
import { Info } from 'lucide-react';

interface BenchmarkData {
  benchmarkDeviceType: string;
  totalSessions: number;
  avgBias?: number;
  lunaAvg?: number;
  benchmarkAvg?: number;
}

const AdminSkinTempBenchmarkTab: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/skintemp/admin/benchmark');
        setBenchmarkData(res.data.data || []);
      } catch (err: unknown) {
        console.error('Error fetching SkinTemp benchmark data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load benchmark data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (benchmarkData.length === 0) {
    return (
      <div className="text-center py-12">
        <Info size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No benchmark comparison data available</p>
        <p className="text-gray-400 text-sm mt-2">
          Benchmark data will appear when SkinTemp sessions are compared against reference devices
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="SkinTemp Bias by Benchmark Device">
        <p className="text-sm text-gray-500 mb-4">
          Comparing Falcon skin temperature readings against different benchmark devices (Apple Watch)
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benchmark Device
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Falcon Avg (°C)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Benchmark Avg (°C)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Bias (°C)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {benchmarkData.map((device) => (
                <tr key={device.benchmarkDeviceType} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900 capitalize">
                      {device.benchmarkDeviceType}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {device.totalSessions}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 font-medium">
                    {device.lunaAvg?.toFixed(2) || '--'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                    {device.benchmarkAvg?.toFixed(2) || '--'}
                  </td>
                  <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${
                    device.avgBias !== undefined
                      ? (device.avgBias >= 0 ? 'text-red-500' : 'text-blue-500')
                      : 'text-gray-400'
                  }`}>
                    {device.avgBias !== undefined 
                      ? `${device.avgBias >= 0 ? '+' : ''}${device.avgBias.toFixed(2)}`
                      : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interpretation */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Understanding SkinTemp Benchmark Comparison</h4>
            <p className="text-xs text-blue-700">
              Apple Watch provides a single average temperature per sleep session, so only bias comparison is meaningful.
              <strong className="block mt-1">Target:</strong> Avg Bias within ±0.3°C. Positive bias means Falcon reads higher than Apple.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSkinTempBenchmarkTab;
