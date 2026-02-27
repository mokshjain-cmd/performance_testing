import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { Metric } from './MetricsSelector';

interface ActivityPerformance {
  _id: string;
  activityType: string;
  avgMAE: number;
  avgRMSE: number;
  avgPearson: number;
  totalSessions: number;
  lastUpdated: string;
}

type ActivityMetric = 'avgMAE' | 'avgRMSE' | 'avgPearson';

interface ActivityAnalysisTabProps {
  metric: Metric;
}

const ActivityAnalysisTab: React.FC<ActivityAnalysisTabProps> = ({ metric }) => {
  const [activityPerformances, setActivityPerformances] = useState<ActivityPerformance[]>([]);
  const [selectedActivityMetric, setSelectedActivityMetric] = useState<ActivityMetric>('avgMAE');

  useEffect(() => {
    const metricParam = metric === 'hr' ? 'HR' : 'SPO2';
    apiClient.get(`/activity-performance?metric=${metricParam}`)
      .then(res => {
        setActivityPerformances(res.data.data || []);
      })
      .catch(err => console.error('Error fetching activity performance:', err));
  }, [metric]);

  const getActivityMetricLabel = (metric: ActivityMetric) => {
    switch (metric) {
      case 'avgMAE': return 'MAE';
      case 'avgRMSE': return 'RMSE';
      case 'avgPearson': return 'Pearson';
    }
  };

  const getActivityMetricTooltip = (metric: ActivityMetric) => {
    switch (metric) {
      case 'avgMAE': return 'Average absolute error';
      case 'avgRMSE': return 'Penalizes large spikes';
      case 'avgPearson': return 'Signal similarity';
    }
  };

  const isActivityBetterValue = (metric: ActivityMetric, value: number, otherValue: number) => {
    if (metric === 'avgPearson') {
      return value > otherValue; // Higher is better
    }
    return value < otherValue; // Lower is better for error metrics
  };

  const getBestActivityPerformer = (metric: ActivityMetric): string | null => {
    if (activityPerformances.length === 0) return null;
    
    let best = activityPerformances[0];
    for (const activity of activityPerformances) {
      if (isActivityBetterValue(metric, activity[metric], best[metric])) {
        best = activity;
      }
    }
    return best.activityType;
  };

  const getActivityChartData = () => {
    return activityPerformances.map(activity => ({
      name: activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1),
      value: activity[selectedActivityMetric],
      sessions: activity.totalSessions,
    }));
  };

  const hasLowSampleSize = (sessions: number) => sessions < 3;

  return (
    <div className="space-y-6">
      <Card title="Activity-wise Performance Analysis">
        {activityPerformances.length > 0 ? (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Activity</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        Sessions
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1" title="Average absolute error">
                        MAE <span className="text-red-500">↓</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1" title="Penalizes large spikes">
                        RMSE <span className="text-red-500">↓</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1" title="Signal similarity">
                        Pearson <span className="text-green-500">↑</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activityPerformances.map((activity) => {
                    const bestMAE = activity.activityType === getBestActivityPerformer('avgMAE');
                    const bestRMSE = activity.activityType === getBestActivityPerformer('avgRMSE');
                    const bestPearson = activity.activityType === getBestActivityPerformer('avgPearson');
                    const lowSample = hasLowSampleSize(activity.totalSessions);
                    
                    return (
                      <tr 
                        key={activity._id} 
                        className={`border-b border-gray-100 hover:bg-gray-50 ${lowSample ? 'opacity-60' : ''}`}
                      >
                        <td className="py-3 px-4 font-medium text-gray-800 capitalize">
                          <div className="flex items-center gap-2">
                            {activity.activityType}
                            {lowSample && (
                              <span 
                                className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded"
                                title="Low sample size - results may not be reliable"
                              >
                                Low Sample
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700 font-medium">
                          {activity.totalSessions ?? 0}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestMAE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {activity.avgMAE != null ? activity.avgMAE.toFixed(2) : '--'}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestRMSE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {activity.avgRMSE != null ? activity.avgRMSE.toFixed(2) : '--'}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestPearson ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {activity.avgPearson != null ? activity.avgPearson.toFixed(3) : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Metric Info */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-2">How to Interpret:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><span className="font-medium">MAE:</span> Mean Absolute Error (BPM) | Lower is better | Target: &lt;5 BPM</div>
                  <div><span className="font-medium">RMSE:</span> Root Mean Square Error (BPM) | Penalizes large spikes | Lower is better | Target: &lt;7 BPM</div>
                  <div><span className="font-medium">Pearson:</span> Correlation (-1 to 1) | Higher is better | Target: &gt;0.9</div>
                  <div><span className="font-medium">Low Sample:</span> Activities with &lt;3 sessions may not be reliable</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No activity data available</p>
            <p className="text-sm mt-2">Data will appear as sessions are recorded</p>
          </div>
        )}
      </Card>

      {/* Bar Chart Comparison */}
      {activityPerformances.length > 0 && (
        <Card title="Visual Metric Comparison by Activity">
          <div className="space-y-4">
            {/* Metric Selector */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedActivityMetric('avgMAE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedActivityMetric === 'avgMAE'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getActivityMetricTooltip('avgMAE')}
              >
                MAE
              </button>
              <button
                onClick={() => setSelectedActivityMetric('avgRMSE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedActivityMetric === 'avgRMSE'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getActivityMetricTooltip('avgRMSE')}
              >
                RMSE
              </button>
              <button
                onClick={() => setSelectedActivityMetric('avgPearson')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedActivityMetric === 'avgPearson'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getActivityMetricTooltip('avgPearson')}
              >
                Pearson
              </button>
            </div>

            {/* Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getActivityChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: getActivityMetricLabel(selectedActivityMetric), angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                    }}
                    formatter={(value: any, name?: string) => {
                      if (name === 'value') {
                        const formattedValue = Number(value).toFixed(selectedActivityMetric === 'avgPearson' ? 3 : 2);
                        return [formattedValue, getActivityMetricLabel(selectedActivityMetric)];
                      }
                      return [value, name || ''];
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0].payload;
                        const lowSample = hasLowSampleSize(data.sessions);
                        return (
                          <div className="space-y-1">
                            <div className="font-semibold">{label}</div>
                            <div className="text-xs text-gray-600">Sessions: {data.sessions}</div>
                            {lowSample && (
                              <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded mt-1">
                                Low sample size
                              </div>
                            )}
                          </div>
                        );
                      }
                      return label;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center text-sm text-gray-600">
              {getActivityMetricTooltip(selectedActivityMetric)}
              {selectedActivityMetric === 'avgPearson' ? ' (higher is better)' : ' (lower is better)'}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ActivityAnalysisTab;
