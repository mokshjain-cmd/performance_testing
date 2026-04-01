import React, { useEffect, useState } from 'react';
import { Card } from '../components/common';
import { activityService } from '../services/activity.service';
import type { UserSingleActivitySessionView } from '../types/activity.types';
import { Footprints, Activity, Calendar, Zap } from 'lucide-react';
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

interface Props {
  sessionId: string | null;
}

export const ActivitySessionPage: React.FC<Props> = ({ sessionId }) => {
  const [sessionData, setSessionData] = useState<UserSingleActivitySessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionData(null);
      setLoading(false);
      return;
    }

    const fetchSessionData = async () => {
      try {
        setLoading(true);
        console.log(`[Activity Session Page] Fetching session data for: ${sessionId}`);
        const data = await activityService.getSingleSessionView(sessionId, true);
        setSessionData(data);
        setError(null);
      } catch (err) {
        console.error('[Activity Session Page] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a session to view details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading session data...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error || 'No session data available'}</div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const comparisonData = sessionData.comparison ? [
    {
      metric: 'Steps',
      Falcon: sessionData.luna.totalSteps,
      Benchmark: sessionData.benchmark?.totalSteps || 0,
    },
    {
      metric: 'Distance (m)',
      Falcon: sessionData.luna.totalDistance,
      Benchmark: sessionData.benchmark?.totalDistance || 0,
    },
    {
      metric: 'Calories',
      Falcon: sessionData.luna.totalCalories ?? 0,
      Benchmark: sessionData.benchmark?.totalCalories ?? 0,
    },
  ] : [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Activity Session Details</h1>
        <div className="flex items-center gap-4 mt-2 text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={16} />
            <span>{formatDate(sessionData.session.date)}</span>
          </div>
        </div>
        {sessionData.session.name && (
          <p className="text-gray-500 mt-1">{sessionData.session.name}</p>
        )}
      </div>

      {/* Falcon KPI Cards - Main Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Falcon Ring Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Footprints className="w-6 h-6 text-blue-600" />
                  <h3 className="text-sm font-medium text-blue-900">Total Steps</h3>
                </div>
                <p className="text-4xl font-bold text-blue-600">
                  {sessionData.luna.totalSteps.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-6 h-6 text-green-600" />
                  <h3 className="text-sm font-medium text-green-900">Total Distance</h3>
                </div>
                <p className="text-4xl font-bold text-green-600">
                  {(sessionData.luna.totalDistance / 1000).toFixed(2)} km
                </p>
                <p className="text-xs text-green-700 mt-1">{sessionData.luna.totalDistance.toFixed(0)} meters</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 p-6">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-6 h-6 text-orange-600" />
                  <h3 className="text-sm font-medium text-orange-900">Total Calories</h3>
                </div>
                <p className="text-4xl font-bold text-orange-600">
                  {sessionData.luna.totalCalories !== null && sessionData.luna.totalCalories !== undefined ? sessionData.luna.totalCalories.toFixed(0) + ' kcal' : '--'}
                </p>
                {sessionData.luna.caloriesActive !== undefined && sessionData.luna.caloriesActive !== null && (
                  <p className="text-sm text-gray-600">
                    Active: {sessionData.luna.caloriesActive.toFixed(0)} | Basal: {sessionData.luna.caloriesBasal !== null && sessionData.luna.caloriesBasal !== undefined ? sessionData.luna.caloriesBasal.toFixed(0) : '--'}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Accuracy Cards - Small Cards */}
      {sessionData.comparison && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Falcon Accuracy</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Steps Accuracy */}
            <Card className={`p-4 ${
            sessionData.comparison.steps.accuracyPercent >= 90 
              ? 'bg-green-50 border-green-200' 
              : sessionData.comparison.steps.accuracyPercent >= 80 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="text-xs text-gray-600 mb-1">Steps</div>
            <div className={`text-2xl font-bold ${
              sessionData.comparison.steps.accuracyPercent >= 90 
                ? 'text-green-600' 
                : sessionData.comparison.steps.accuracyPercent >= 80 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {sessionData.comparison.steps.accuracyPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Accuracy</div>
          </Card>

          {/* Distance Accuracy */}
          <Card className={`p-4 ${
            sessionData.comparison.distance.accuracyPercent >= 90 
              ? 'bg-green-50 border-green-200' 
              : sessionData.comparison.distance.accuracyPercent >= 80 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="text-xs text-gray-600 mb-1">Distance</div>
            <div className={`text-2xl font-bold ${
              sessionData.comparison.distance.accuracyPercent >= 90 
                ? 'text-green-600' 
                : sessionData.comparison.distance.accuracyPercent >= 80 
                ? 'text-yellow-600' 
                : 'text-red-600'
            }`}>
              {sessionData.comparison.distance.accuracyPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Accuracy</div>
          </Card>

          {/* Total Calories Accuracy */}
          {sessionData.comparison.calories?.accuracyPercent != null && (
            <Card className={`p-4 ${
              sessionData.comparison.calories.accuracyPercent >= 90 
                ? 'bg-green-50 border-green-200' 
                : sessionData.comparison.calories.accuracyPercent >= 80 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs text-gray-600 mb-1">Calories</div>
              <div className={`text-2xl font-bold ${
                sessionData.comparison.calories.accuracyPercent >= 90 
                  ? 'text-green-600' 
                  : sessionData.comparison.calories.accuracyPercent >= 80 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {sessionData.comparison.calories.accuracyPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Accuracy</div>
            </Card>
          )}

          {/* Active Calories Accuracy */}
          {sessionData.comparison.activeCalories?.accuracyPercent != null && (
            <Card className={`p-4 ${
              sessionData.comparison.activeCalories.accuracyPercent >= 90 
                ? 'bg-green-50 border-green-200' 
                : sessionData.comparison.activeCalories.accuracyPercent >= 80 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs text-gray-600 mb-1">Active Cal</div>
              <div className={`text-2xl font-bold ${
                sessionData.comparison.activeCalories.accuracyPercent >= 90 
                  ? 'text-green-600' 
                  : sessionData.comparison.activeCalories.accuracyPercent >= 80 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {sessionData.comparison.activeCalories.accuracyPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Accuracy</div>
            </Card>
          )}

          {/* Basal Calories Accuracy */}
          {sessionData.comparison.basalCalories?.accuracyPercent != null && (
            <Card className={`p-4 ${
              sessionData.comparison.basalCalories.accuracyPercent >= 90 
                ? 'bg-green-50 border-green-200' 
                : sessionData.comparison.basalCalories.accuracyPercent >= 80 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-xs text-gray-600 mb-1">Basal Cal</div>
              <div className={`text-2xl font-bold ${
                sessionData.comparison.basalCalories.accuracyPercent >= 90 
                  ? 'text-green-600' 
                  : sessionData.comparison.basalCalories.accuracyPercent >= 80 
                  ? 'text-yellow-600' 
                  : 'text-red-600'
              }`}>
                {sessionData.comparison.basalCalories.accuracyPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Accuracy</div>
            </Card>
          )}
        </div>
        </div>
      )}

      {/* Row-wise Comparison Table */}
      {sessionData.comparison && sessionData.benchmark && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Comparison with Benchmark Device ({sessionData.benchmark.deviceType})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Steps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                  {sessionData.comparison.calories?.bias != null && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</th>
                  )}
                  {sessionData.comparison.activeCalories?.bias != null && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Cal</th>
                  )}
                  {sessionData.comparison.basalCalories?.bias != null && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Basal Cal</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Falcon Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">Falcon</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.luna.totalSteps.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(sessionData.luna.totalDistance / 1000).toFixed(2)} km</td>
                  {sessionData.comparison.calories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sessionData.luna.totalCalories !== null && sessionData.luna.totalCalories !== undefined ? sessionData.luna.totalCalories.toFixed(0) + ' kcal' : '--'}
                    </td>
                  )}
                  {sessionData.comparison.activeCalories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.luna.caloriesActive !== null && sessionData.luna.caloriesActive !== undefined ? sessionData.luna.caloriesActive.toFixed(0) : '--'} kcal</td>
                  )}
                  {sessionData.comparison.basalCalories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.luna.caloriesBasal !== null && sessionData.luna.caloriesBasal !== undefined ? sessionData.luna.caloriesBasal.toFixed(0) : '--'} kcal</td>
                  )}
                </tr>

                {/* Benchmark Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{sessionData.benchmark.deviceType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.benchmark.totalSteps.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{(sessionData.benchmark.totalDistance / 1000).toFixed(2)} km</td>
                  {sessionData.comparison.calories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {sessionData.benchmark.totalCalories !== null && sessionData.benchmark.totalCalories !== undefined ? sessionData.benchmark.totalCalories.toFixed(0) + ' kcal' : '--'}
                    </td>
                  )}
                  {sessionData.comparison.activeCalories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.benchmark.caloriesActive !== null && sessionData.benchmark.caloriesActive !== undefined ? sessionData.benchmark.caloriesActive.toFixed(0) : '--'} kcal</td>
                  )}
                  {sessionData.comparison.basalCalories?.bias != null && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{sessionData.benchmark.caloriesBasal !== null && sessionData.benchmark.caloriesBasal !== undefined ? sessionData.benchmark.caloriesBasal.toFixed(0) : '--'} kcal</td>
                  )}
                </tr>

                {/* Difference Row */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Difference</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    sessionData.comparison.steps.bias > 0 ? 'text-red-600' : sessionData.comparison.steps.bias < 0 ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {sessionData.comparison.steps.bias > 0 ? '+' : ''}{sessionData.comparison.steps.bias.toFixed(0)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                    sessionData.comparison.distance.bias > 0 ? 'text-red-600' : sessionData.comparison.distance.bias < 0 ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {sessionData.comparison.distance.bias > 0 ? '+' : ''}{(sessionData.comparison.distance.bias / 1000).toFixed(2)} km
                  </td>
                  {sessionData.comparison.calories?.bias != null && (
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      sessionData.comparison.calories.bias > 0 ? 'text-red-600' : sessionData.comparison.calories.bias < 0 ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {sessionData.comparison.calories.bias > 0 ? '+' : ''}{sessionData.comparison.calories.bias.toFixed(0)} kcal
                    </td>
                  )}
                  {sessionData.comparison.activeCalories?.bias != null && (
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      sessionData.comparison.activeCalories.bias > 0 ? 'text-red-600' : sessionData.comparison.activeCalories.bias < 0 ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {sessionData.comparison.activeCalories.bias > 0 ? '+' : ''}{sessionData.comparison.activeCalories.bias.toFixed(0)} kcal
                    </td>
                  )}
                  {sessionData.comparison.basalCalories?.bias != null && (
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                      sessionData.comparison.basalCalories.bias > 0 ? 'text-red-600' : sessionData.comparison.basalCalories.bias < 0 ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {sessionData.comparison.basalCalories.bias > 0 ? '+' : ''}{sessionData.comparison.basalCalories.bias.toFixed(0)} kcal
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison Chart */}
      {sessionData.comparison && sessionData.benchmark && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Visual Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Falcon" fill="#3b82f6" />
              <Bar dataKey="Benchmark" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      
    </div>
  );
};
