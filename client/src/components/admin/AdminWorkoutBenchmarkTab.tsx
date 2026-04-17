import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { getAdminWorkoutBenchmarkComparison } from '../../services/workout.service';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface BenchmarkData {
  benchmarkDeviceType: string;
  totalSessions: number;
  // Backend returns hrStats with PascalCase fields
  hrStats?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
    avgBias?: number;
  };
  sportTypeBreakdown?: {
    sportType: number;
    sportName: string;
    sessions: number;
    avgMae: number;
    avgPearsonR: number;
  }[];
}

const getAccuracyColor = (mae: number): string => {
  if (mae <= 5) return 'text-green-600';
  if (mae <= 10) return 'text-yellow-600';
  return 'text-red-600';
};

const getAccuracyBg = (mae: number): string => {
  if (mae <= 5) return 'bg-green-50';
  if (mae <= 10) return 'bg-yellow-50';
  return 'bg-red-50';
};

const AdminWorkoutBenchmarkTab: React.FC = () => {
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAdminWorkoutBenchmarkComparison();
        setBenchmarkData(data || []);
      } catch (err: any) {
        console.error('Error fetching benchmark data:', err);
        setError(err.message || 'Failed to load benchmark data');
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
          Benchmark data will appear when workout sessions are compared against reference devices
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Workout HR Accuracy by Benchmark Device">
        <p className="text-sm text-gray-500 mb-4">
          Comparing Falcon workout HR readings against different benchmark devices
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
                  MAE (BPM)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  RMSE (BPM)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MAPE (%)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pearson R
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mean Bias
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {benchmarkData.map((device) => {
                const mae = device.hrStats?.avgMAE;
                const rmse = device.hrStats?.avgRMSE;
                const mape = device.hrStats?.avgMAPE;
                const pearson = device.hrStats?.avgPearson;
                const bias = device.hrStats?.avgBias;
                const isPass = mae !== undefined && pearson !== undefined && mae <= 5 && pearson >= 0.9;
                
                return (
                  <tr key={device.benchmarkDeviceType} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 capitalize">
                        {device.benchmarkDeviceType}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {device.totalSessions}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${mae !== undefined ? getAccuracyColor(mae) : 'text-gray-400'}`}>
                      {mae?.toFixed(2) || '--'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {rmse?.toFixed(2) || '--'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {mape !== undefined ? `${mape.toFixed(2)}%` : '--'}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-semibold ${
                      pearson !== undefined ? (
                        pearson >= 0.9 ? 'text-green-600' : pearson >= 0.8 ? 'text-yellow-600' : 'text-red-600'
                      ) : 'text-gray-400'
                    }`}>
                      {pearson?.toFixed(3) || '--'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {bias?.toFixed(2) || '--'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {isPass ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle size={12} /> Pass
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          <XCircle size={12} /> Review
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sport Type Breakdown per Benchmark */}
      {benchmarkData.some(d => d.sportTypeBreakdown && d.sportTypeBreakdown.length > 0) && (
        <Card title="Accuracy by Sport Type & Benchmark">
          <div className="space-y-6">
            {benchmarkData.filter(d => d.sportTypeBreakdown && d.sportTypeBreakdown.length > 0).map((device) => (
              <div key={device.benchmarkDeviceType}>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                  vs {device.benchmarkDeviceType}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {device.sportTypeBreakdown?.map((sport) => (
                    <div 
                      key={sport.sportType}
                      className={`p-3 rounded-lg ${getAccuracyBg(sport.avgMae)}`}
                    >
                      <div className="text-sm font-medium text-gray-700">{sport.sportName}</div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">{sport.sessions} sessions</span>
                        <span className={`text-xs font-semibold ${getAccuracyColor(sport.avgMae)}`}>
                          MAE: {sport.avgMae?.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Pearson R: {sport.avgPearsonR?.toFixed(3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Interpretation */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-1">Understanding Benchmark Comparison</h4>
            <p className="text-xs text-blue-700">
              This table shows how accurately Falcon measures heart rate during workouts compared to medical-grade reference devices.
              <strong className="block mt-1">Targets:</strong> MAE &lt; 5 BPM, RMSE &lt; 7 BPM, Pearson R &gt; 0.90, Mean Bias within ±2 BPM.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkoutBenchmarkTab;
