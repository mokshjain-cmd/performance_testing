import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { activityService } from '../../services/activity.service';
import type { FirmwareActivityPerformance } from '../../types/activity.types';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AdminActivityFirmwareTab: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwareActivityPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[Activity Firmware] Fetching firmware comparison...');
        const data = await activityService.getFirmwareComparison();
        console.log('[Activity Firmware] ✅ Received data:', data);
        // Sort by firmware version (assuming semantic versioning)
        const sorted = data.sort((a, b) => {
          const parseVersion = (v: string) => {
            const parts = v.split('.').map(Number);
            return parts[0] * 10000 + parts[1] * 100 + (parts[2] || 0);
          };
          return parseVersion(a.firmwareVersion) - parseVersion(b.firmwareVersion);
        });
        setFirmwareData(sorted);
      } catch (err) {
        console.error('[Activity Firmware] ❌ Error:', err);
        console.error('Error loading firmware comparison:', err);
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
          <p className="text-gray-600">Loading firmware comparison...</p>
        </div>
      </div>
    );
  }

  if (firmwareData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No firmware comparison data available</p>
      </div>
    );
  }

  const accuracyChartData = firmwareData.map(f => ({
    version: f.firmwareVersion,
    steps: f.activityStats.steps.avgAccuracyPercent,
    distance: f.activityStats.distance.avgAccuracyPercent,
    calories: f.activityStats.calories.avgAccuracyPercent,
  }));

  const differenceChartData = firmwareData.map(f => ({
    version: f.firmwareVersion,
    stepDiff: f.activityStats.steps.avgDifference,
    distanceDiff: f.activityStats.distance.avgDifference,
    calorieDiff: f.activityStats.calories.avgDifference,
  }));

  // Calculate improvement percentages
  const calculateImprovement = (oldest: number, newest: number) => {
    if (oldest === 0) return 0;
    return ((newest - oldest) / oldest) * 100;
  };

  const latestVersion = firmwareData[firmwareData.length - 1];
  const oldestVersion = firmwareData[0];
  const hasMultipleVersions = firmwareData.length > 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Firmware Performance Analysis</h2>
        <p className="text-gray-600">Track algorithm improvements across firmware versions</p>
      </div>

      {/* Improvement Summary (if multiple versions) */}
      {hasMultipleVersions && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Steps Improvement</p>
              <p className="text-3xl font-bold text-blue-600">
                +{calculateImprovement(
                  oldestVersion.activityStats.steps.avgAccuracyPercent,
                  latestVersion.activityStats.steps.avgAccuracyPercent
                ).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {oldestVersion.firmwareVersion} → {latestVersion.firmwareVersion}
              </p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Distance Improvement</p>
              <p className="text-3xl font-bold text-green-600">
                +{calculateImprovement(
                  oldestVersion.activityStats.distance.avgAccuracyPercent,
                  latestVersion.activityStats.distance.avgAccuracyPercent
                ).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {oldestVersion.firmwareVersion} → {latestVersion.firmwareVersion}
              </p>
            </div>
          </Card>

          <Card>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Calorie Improvement</p>
              <p className="text-3xl font-bold text-orange-600">
                +{calculateImprovement(
                  oldestVersion.activityStats.calories.avgAccuracyPercent,
                  latestVersion.activityStats.calories.avgAccuracyPercent
                ).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">
                {oldestVersion.firmwareVersion} → {latestVersion.firmwareVersion}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Firmware Comparison Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Version Comparison Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Firmware</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Sessions</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Step Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Distance Accuracy</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Calorie Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {firmwareData.map((firmware) => (
                <tr key={firmware.firmwareVersion} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-800">
                    {firmware.firmwareVersion}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-600">
                    {firmware.totalSessions}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      firmware.activityStats.steps.avgAccuracyPercent >= 90 ? 'text-green-600' :
                      firmware.activityStats.steps.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {firmware.activityStats.steps.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      firmware.activityStats.distance.avgAccuracyPercent >= 90 ? 'text-green-600' :
                      firmware.activityStats.distance.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {firmware.activityStats.distance.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-semibold ${
                      firmware.activityStats.calories.avgAccuracyPercent >= 90 ? 'text-green-600' :
                      firmware.activityStats.calories.avgAccuracyPercent >= 80 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {firmware.activityStats.calories.avgAccuracyPercent.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Accuracy Improvement Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Accuracy Improvement by Firmware Version</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={accuracyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="version" stroke="#6b7280" style={{ fontSize: '12px' }} />
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
            <Line
              type="monotone"
              dataKey="steps"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Steps"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="distance"
              stroke="#10b981"
              strokeWidth={2}
              name="Distance"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="calories"
              stroke="#f97316"
              strokeWidth={2}
              name="Calories"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Upward trends show algorithm improvements. Target: all metrics above 90%.
        </p>
      </Card>

      {/* Difference Analysis Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Average Difference by Firmware</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={differenceChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="version" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis
              label={{ value: 'Average Difference (Falcon - Benchmark)', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined) return ['N/A', name || ''];
                if (name === 'stepDiff') return [`${Math.round(value)} steps`, 'Steps Difference'];
                if (name === 'distanceDiff') return [`${Math.round(value)}m`, 'Distance Difference'];
                if (name === 'calorieDiff') return [`${Math.round(value)} kcal`, 'Calorie Difference'];
                return [value, name || ''];
              }}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Legend />
            <Bar dataKey="stepDiff" fill="#3b82f6" name="Steps Difference" />
            <Bar dataKey="distanceDiff" fill="#10b981" name="Distance Difference" />
            <Bar dataKey="calorieDiff" fill="#f97316" name="Calorie Difference" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Values closer to 0 = better accuracy. Positive = overcount, Negative = undercount.
        </p>
      </Card>

      {/* Insights */}
      <Card>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2">🚀 Firmware Validation Insights</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li><strong>Version Progression:</strong> Each new firmware should show accuracy improvement</li>
            <li><strong>MAE Trends:</strong> Lower MAE = more consistent predictions across all users</li>
            <li><strong>Testing Strategy:</strong> Compare latest firmware with at least {latestVersion.totalSessions} sessions</li>
            <li><strong>Release Criteria:</strong> New firmware should show {'>'} 5% accuracy improvement or {'<'} 20% MAE reduction</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AdminActivityFirmwareTab;
