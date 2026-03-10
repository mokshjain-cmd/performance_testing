import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { activityService } from '../../services/activity.service';
import type { BenchmarkActivityComparison } from '../../types/activity.types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AdminActivityBenchmarkTab: React.FC = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkActivityComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[Activity Benchmark] Fetching benchmark comparison...');
        const data = await activityService.getBenchmarkComparison();
        console.log('[Activity Benchmark] ✅ Received data:', data);
        setBenchmarks(data);
      } catch (err) {
        console.error('[Activity Benchmark] ❌ Error:', err);
        console.error('Error loading benchmark comparison:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading benchmark comparison...</p>
        </div>
      </div>
    );
  }

  if (benchmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No benchmark comparison data available</p>
      </div>
    );
  }

  const accuracyChartData = benchmarks.map(b => ({
    name: b.benchmarkDevice || 'Unknown',
    steps: b.activityStats?.steps?.avgAccuracyPercent || 0,
    distance: b.activityStats?.distance?.avgAccuracyPercent || 0,
    calories: b.activityStats?.calories?.avgAccuracyPercent || 0,
  }));

  const differenceChartData = benchmarks.map(b => ({
    name: b.benchmarkDevice || 'Unknown',
    steps: Math.round(b.activityStats?.steps?.avgDifference || 0),
    distance: Math.round(b.activityStats?.distance?.avgDifference || 0),
    calories: Math.round(b.activityStats?.calories?.avgDifference || 0),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Benchmark Device Comparison</h2>
        <p className="text-gray-600">Compare Falcon performance against different benchmark devices</p>
      </div>

      {/* Comparison Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Device Comparison Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Benchmark Device</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Sessions</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Step Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Distance Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Calorie Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Step Difference</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((benchmark) => (
                <tr key={benchmark.benchmarkDevice || 'unknown'} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-800 capitalize">
                    {benchmark.benchmarkDevice || 'Unknown Device'}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {benchmark.totalSessions || 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {benchmark.activityStats?.steps ? (
                      <span className={`font-semibold ${
                        benchmark.activityStats.steps.avgAccuracyPercent >= 90 ? 'text-green-600' :
                        benchmark.activityStats.steps.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {benchmark.activityStats.steps.avgAccuracyPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {benchmark.activityStats?.distance ? (
                      <span className={`font-semibold ${
                        benchmark.activityStats.distance.avgAccuracyPercent >= 90 ? 'text-green-600' :
                        benchmark.activityStats.distance.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {benchmark.activityStats.distance.avgAccuracyPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {benchmark.activityStats?.calories ? (
                      <span className={`font-semibold ${
                        benchmark.activityStats.calories.avgAccuracyPercent >= 90 ? 'text-green-600' :
                        benchmark.activityStats.calories.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {benchmark.activityStats.calories.avgAccuracyPercent.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {benchmark.activityStats?.steps ? (
                      <span className="font-semibold text-gray-700">
                        {benchmark.activityStats.steps.avgDifference > 0 ? '+' : ''}
                        {Math.round(benchmark.activityStats.steps.avgDifference)}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Accuracy Comparison Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Accuracy Comparison by Benchmark</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={accuracyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis
              domain={[0, 100]}
              label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(1)}%` : 'N/A'}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="steps" fill="#3b82f6" name="Steps" />
            <Bar dataKey="distance" fill="#10b981" name="Distance" />
            <Bar dataKey="calories" fill="#f97316" name="Calories" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Higher bars indicate better accuracy. Falcon performs best when all bars are above 90%.
        </p>
      </Card>

      {/* Difference Comparison Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Difference Comparison by Benchmark</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={differenceChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis
              label={{ value: 'Difference (Falcon - Benchmark)', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return ['N/A', name || ''];
                if (name === 'steps') return [`${value} steps`, 'Steps'];
                if (name === 'distance') return [`${value}m`, 'Distance'];
                if (name === 'calories') return [`${value} kcal`, 'Calories'];
                return [value, name || ''];
              }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="steps" fill="#3b82f6" name="Steps" />
            <Bar dataKey="distance" fill="#10b981" name="Distance" />
            <Bar dataKey="calories" fill="#f97316" name="Calories" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Difference close to 0 is ideal. Negative values = undercount, Positive values = overcount.
        </p>
      </Card>

      {/* Insights */}
      <Card>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Key Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>Best Performer:</strong> Look for the device with highest accuracy across all metrics</li>
            <li><strong>Systematic Bias:</strong> Consistent bias across benchmarks suggests algorithm calibration needed</li>
            <li><strong>Sample Size:</strong> More sessions = more reliable comparison</li>
            <li><strong>Device Differences:</strong> Different benchmarks use different algorithms, causing variation</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AdminActivityBenchmarkTab;
