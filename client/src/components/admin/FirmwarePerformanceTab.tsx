import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import axios from 'axios';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FirmwarePerformance {
  _id: string;
  firmwareVersion: string;
  computedAt: string;
  totalSessions: number;
  totalUsers: number;
  overallAccuracy: {
    avgMAE: number;
    avgRMSE: number;
    avgMAPE: number;
    avgPearson: number;
  };
  activityWise: Array<{
    _id: string;
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
  }>;
}

type FirmwareMetric = 'avgMAE' | 'avgRMSE' | 'avgMAPE' | 'avgPearson';
type SortKey = 'firmwareVersion' | 'totalSessions' | 'avgMAE' | 'avgRMSE' | 'avgMAPE' | 'avgPearson';
type SortOrder = 'asc' | 'desc';

const FirmwarePerformanceTab: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwarePerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<FirmwareMetric>('avgMAE');
  const [selectedFirmware, setSelectedFirmware] = useState<FirmwarePerformance | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('firmwareVersion');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:3000/api/firmware-performance')
      .then(res => {
        setFirmwareData(res.data.data || []);
        console.log('Fetched firmware performance:', res.data.data);
      })
      .catch(err => console.error('Error fetching firmware performance:', err))
      .finally(() => setLoading(false));
  }, []);

  const getMetricLabel = (metric: FirmwareMetric) => {
    switch (metric) {
      case 'avgMAE': return 'MAE';
      case 'avgRMSE': return 'RMSE';
      case 'avgMAPE': return 'MAPE';
      case 'avgPearson': return 'Pearson';
    }
  };

  const getMetricTooltip = (metric: FirmwareMetric) => {
    switch (metric) {
      case 'avgMAE': return 'Mean Absolute Error';
      case 'avgRMSE': return 'Root Mean Square Error';
      case 'avgMAPE': return 'Mean Absolute Percentage Error';
      case 'avgPearson': return 'Pearson Correlation';
    }
  };

  const isBetterValue = (metric: FirmwareMetric, value: number, otherValue: number) => {
    if (metric === 'avgPearson') {
      return value > otherValue;
    }
    return value < otherValue;
  };

  const getBestPerformer = (metric: FirmwareMetric): string | null => {
    if (firmwareData.length === 0) return null;
    
    let best = firmwareData[0];
    for (const firmware of firmwareData) {
      if (isBetterValue(metric, firmware.overallAccuracy[metric], best.overallAccuracy[metric])) {
        best = firmware;
      }
    }
    return best.firmwareVersion;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortedData = () => {
    const sorted = [...firmwareData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortKey === 'firmwareVersion' || sortKey === 'totalSessions') {
        aValue = sortKey === 'firmwareVersion' ? a.firmwareVersion : a.totalSessions;
        bValue = sortKey === 'firmwareVersion' ? b.firmwareVersion : b.totalSessions;
      } else {
        aValue = a.overallAccuracy[sortKey];
        bValue = b.overallAccuracy[sortKey];
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  };

  const getBarChartData = () => {
    return firmwareData.map(fw => ({
      name: fw.firmwareVersion,
      value: fw.overallAccuracy[selectedMetric],
      sessions: fw.totalSessions,
    }));
  };

  const getTrendLineData = () => {
    return firmwareData.map(fw => ({
      version: fw.firmwareVersion,
      value: fw.overallAccuracy[selectedMetric],
    }));
  };

  const getActivityMatrix = () => {
    // Get all unique activities
    const activities = new Set<string>();
    firmwareData.forEach(fw => {
      fw.activityWise.forEach(act => activities.add(act.activityType));
    });

    // Build matrix
    const matrix = Array.from(activities).map(activity => {
      const row: any = { activity };
      firmwareData.forEach(fw => {
        const activityData = fw.activityWise.find(a => a.activityType === activity);
        row[fw.firmwareVersion] = activityData 
          ? { accuracy: activityData.avgAccuracy, sessions: activityData.totalSessions }
          : null;
      });
      return row;
    });

    return matrix;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const SortIcon: React.FC<{ columnKey: SortKey }> = ({ columnKey }) => {
    if (sortKey !== columnKey) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading firmware data...</p>
        </div>
      </div>
    );
  }

  if (firmwareData.length === 0) {
    return (
      <Card title="Firmware Performance">
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔧</div>
          <p>No firmware data available</p>
          <p className="text-sm mt-2">Data will appear as sessions are recorded</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Firmware Comparison Table */}
      <Card title="Firmware Comparison Overview">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th 
                  className="text-left py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('firmwareVersion')}
                >
                  <div className="flex items-center gap-2">
                    Firmware
                    <SortIcon columnKey="firmwareVersion" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('totalSessions')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Sessions
                    <SortIcon columnKey="totalSessions" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgMAE')}
                  title="Mean Absolute Error"
                >
                  <div className="flex items-center justify-center gap-2">
                    MAE <span className="text-red-500">↓</span>
                    <SortIcon columnKey="avgMAE" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgRMSE')}
                  title="Root Mean Square Error"
                >
                  <div className="flex items-center justify-center gap-2">
                    RMSE <span className="text-red-500">↓</span>
                    <SortIcon columnKey="avgRMSE" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgMAPE')}
                  title="Mean Absolute Percentage Error"
                >
                  <div className="flex items-center justify-center gap-2">
                    MAPE <span className="text-red-500">↓</span>
                    <SortIcon columnKey="avgMAPE" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('avgPearson')}
                  title="Pearson Correlation"
                >
                  <div className="flex items-center justify-center gap-2">
                    Pearson <span className="text-green-500">↑</span>
                    <SortIcon columnKey="avgPearson" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {getSortedData().map((firmware) => {
                const bestMAE = firmware.firmwareVersion === getBestPerformer('avgMAE');
                const bestRMSE = firmware.firmwareVersion === getBestPerformer('avgRMSE');
                const bestMAPE = firmware.firmwareVersion === getBestPerformer('avgMAPE');
                const bestPearson = firmware.firmwareVersion === getBestPerformer('avgPearson');
                
                return (
                  <tr 
                    key={firmware._id} 
                    className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors ${
                      selectedFirmware?._id === firmware._id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedFirmware(selectedFirmware?._id === firmware._id ? null : firmware)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {firmware.firmwareVersion}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">
                      {firmware.totalSessions}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${bestMAE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                      {firmware.overallAccuracy.avgMAE.toFixed(2)}
                      {bestMAE && <span className="ml-2 text-xs">🟢</span>}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${bestRMSE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                      {firmware.overallAccuracy.avgRMSE.toFixed(2)}
                      {bestRMSE && <span className="ml-2 text-xs">🟢</span>}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${bestMAPE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                      {firmware.overallAccuracy.avgMAPE.toFixed(2)}%
                      {bestMAPE && <span className="ml-2 text-xs">🟢</span>}
                    </td>
                    <td className={`py-3 px-4 text-center font-semibold ${bestPearson ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                      {firmware.overallAccuracy.avgPearson.toFixed(3)}
                      {bestPearson && <span className="ml-2 text-xs">🟢</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600 text-center">
          💡 Click on any firmware version to view detailed breakdown
        </div>
      </Card>

      {/* 2. Metric Toggle Bar Chart */}
      <Card title="Performance Metrics by Firmware Version">
        <div className="space-y-4">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setSelectedMetric('avgMAE')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === 'avgMAE'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={getMetricTooltip('avgMAE')}
            >
              MAE
            </button>
            <button
              onClick={() => setSelectedMetric('avgRMSE')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === 'avgRMSE'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={getMetricTooltip('avgRMSE')}
            >
              RMSE
            </button>
            <button
              onClick={() => setSelectedMetric('avgMAPE')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === 'avgMAPE'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={getMetricTooltip('avgMAPE')}
            >
              MAPE
            </button>
            <button
              onClick={() => setSelectedMetric('avgPearson')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === 'avgPearson'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={getMetricTooltip('avgPearson')}
            >
              Pearson
            </button>
          </div>

          {/* Bar Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBarChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
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
                  label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  formatter={(value: any) => {
                    const formattedValue = selectedMetric === 'avgMAPE' 
                      ? `${Number(value).toFixed(2)}%`
                      : Number(value).toFixed(selectedMetric === 'avgPearson' ? 3 : 2);
                    return [formattedValue, getMetricLabel(selectedMetric)];
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) {
                      const data = payload[0].payload;
                      return (
                        <div className="space-y-1">
                          <div className="font-semibold">Firmware {label}</div>
                          <div className="text-xs text-gray-600">Sessions: {data.sessions}</div>
                        </div>
                      );
                    }
                    return label;
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {getBarChartData().map((entry, index) => {
                    const isBest = entry.name === getBestPerformer(selectedMetric);
                    return <Cell key={`cell-${index}`} fill={isBest ? '#10b981' : '#3b82f6'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center text-sm text-gray-600">
            {getMetricTooltip(selectedMetric)}
            {selectedMetric === 'avgPearson' ? ' (higher is better)' : ' (lower is better)'}
          </div>
        </div>
      </Card>

      {/* 4. Trend Line (Release Progression) */}
      {firmwareData.length > 1 && (
        <Card title="Firmware Performance Evolution">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getTrendLineData()} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="version" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  label={{ value: getMetricLabel(selectedMetric), angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                  formatter={(value: any) => {
                    const formattedValue = selectedMetric === 'avgMAPE' 
                      ? `${Number(value).toFixed(2)}%`
                      : Number(value).toFixed(selectedMetric === 'avgPearson' ? 3 : 2);
                    return [formattedValue, getMetricLabel(selectedMetric)];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-sm text-gray-600 mt-4">
            📈 Shows how {getMetricLabel(selectedMetric)} evolved across firmware releases
          </div>
        </Card>
      )}

      {/* 3. Firmware Detail View (Click-to-Drill) */}
      {selectedFirmware && (
        <Card title={`🔍 Firmware ${selectedFirmware.firmwareVersion} - Detailed Analysis`}>
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-600 font-medium mb-1">MAE</div>
                <div className="text-2xl font-bold text-blue-900">{selectedFirmware.overallAccuracy.avgMAE.toFixed(2)}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="text-sm text-purple-600 font-medium mb-1">RMSE</div>
                <div className="text-2xl font-bold text-purple-900">{selectedFirmware.overallAccuracy.avgRMSE.toFixed(2)}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                <div className="text-sm text-orange-600 font-medium mb-1">MAPE</div>
                <div className="text-2xl font-bold text-orange-900">{selectedFirmware.overallAccuracy.avgMAPE.toFixed(2)}%</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="text-sm text-green-600 font-medium mb-1">Pearson</div>
                <div className="text-2xl font-bold text-green-900">{selectedFirmware.overallAccuracy.avgPearson.toFixed(3)}</div>
              </div>
            </div>

            {/* Summary Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Total Sessions</div>
                <div className="text-xl font-semibold text-gray-800">{selectedFirmware.totalSessions}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="text-xl font-semibold text-gray-800">{selectedFirmware.totalUsers}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Computed At</div>
                <div className="text-xl font-semibold text-gray-800">{formatDate(selectedFirmware.computedAt)}</div>
              </div>
            </div>

            {/* Activity-wise Performance Table */}
            {selectedFirmware.activityWise.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Activity-wise Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Activity</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Accuracy %</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Sessions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFirmware.activityWise
                        .sort((a, b) => b.avgAccuracy - a.avgAccuracy)
                        .map((activity) => (
                          <tr key={activity._id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium text-gray-800 capitalize">
                              {activity.activityType}
                            </td>
                            <td className="py-3 px-4 text-center font-semibold text-gray-700">
                              {activity.avgAccuracy.toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700">
                              {activity.totalSessions}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Horizontal Bar Chart for Activities */}
                <div className="mt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={selectedFirmware.activityWise
                        .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
                        .map(act => ({
                          name: act.activityType.charAt(0).toUpperCase() + act.activityType.slice(1),
                          accuracy: act.avgAccuracy,
                          sessions: act.totalSessions,
                        }))} 
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        type="number" 
                        domain={[90, 100]}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Accuracy %', position: 'bottom', style: { fontSize: '12px' } }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        width={90}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                        formatter={(value: any, name: string, props) => {
                          if (name === 'accuracy') {
                            return [`${Number(value).toFixed(2)}%`, 'Accuracy'];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload.length > 0) {
                            const data = payload[0].payload;
                            return (
                              <div className="space-y-1">
                                <div className="font-semibold">{label}</div>
                                <div className="text-xs text-gray-600">Sessions: {data.sessions}</div>
                              </div>
                            );
                          }
                          return label;
                        }}
                      />
                      <Bar dataKey="accuracy" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 5. Activity × Firmware Matrix */}
      {firmwareData.length > 1 && (
        <Card title="Activity × Firmware Performance Matrix">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 sticky left-0 bg-white z-10">Activity</th>
                  {firmwareData.map(fw => (
                    <th key={fw._id} className="text-center py-3 px-4 font-semibold text-gray-700 min-w-[120px]">
                      {fw.firmwareVersion}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getActivityMatrix().map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800 capitalize sticky left-0 bg-white">
                      {row.activity}
                    </td>
                    {firmwareData.map(fw => {
                      const cellData = row[fw.firmwareVersion];
                      return (
                        <td key={fw._id} className="py-3 px-4 text-center">
                          {cellData ? (
                            <div>
                              <div className="font-semibold text-gray-800">{cellData.accuracy.toFixed(2)}%</div>
                              <div className="text-xs text-gray-500">({cellData.sessions} sessions)</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            💡 This matrix shows how each activity performs across different firmware versions
          </div>
        </Card>
      )}
    </div>
  );
};

export default FirmwarePerformanceTab;
