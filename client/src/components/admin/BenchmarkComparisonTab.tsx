import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface BenchmarkComparison {
  _id: string;
  benchmarkDeviceType: string;
  totalSessions: number;
  hrStats: {
    avgMAE: number;
    avgRMSE: number;
    avgMAPE: number;
    avgPearson: number;
    avgBias: number;
  };
  lastUpdated: string;
}

type BenchmarkMetric = 'avgMAE' | 'avgRMSE' | 'avgMAPE' | 'avgPearson' | 'avgBias';

const BenchmarkComparisonTab: React.FC = () => {
  const [benchmarkComparisons, setBenchmarkComparisons] = useState<BenchmarkComparison[]>([]);
  const [selectedBenchmarkMetric, setSelectedBenchmarkMetric] = useState<BenchmarkMetric>('avgMAE');

  useEffect(() => {
    apiClient.get('/benchmark-comparisons')
      .then(res => {
        setBenchmarkComparisons(res.data.data || []);
        console.log('Fetched benchmark comparisons:', res.data.data);
      })
      .catch(err => console.error('Error fetching benchmark comparisons:', err));
  }, []);

  const getBenchmarkMetricLabel = (metric: BenchmarkMetric) => {
    switch (metric) {
      case 'avgMAE': return 'MAE';
      case 'avgRMSE': return 'RMSE';
      case 'avgMAPE': return 'MAPE';
      case 'avgPearson': return 'Pearson';
      case 'avgBias': return 'Bias';
    }
  };

  const getBenchmarkMetricTooltip = (metric: BenchmarkMetric) => {
    switch (metric) {
      case 'avgMAE': return 'Average absolute error';
      case 'avgRMSE': return 'Penalizes large spikes';
      case 'avgMAPE': return 'Relative percentage error';
      case 'avgPearson': return 'Signal similarity';
      case 'avgBias': return 'Systematic over/under reading';
    }
  };

  const isBetterValue = (metric: BenchmarkMetric, value: number, otherValue: number) => {
    if (metric === 'avgPearson') {
      return value > otherValue; // Higher is better
    }
    return value < otherValue; // Lower is better for error metrics
  };

  const getBestPerformer = (metric: BenchmarkMetric): string | null => {
    if (benchmarkComparisons.length === 0) return null;
    
    let best = benchmarkComparisons[0];
    for (const comp of benchmarkComparisons) {
      if (isBetterValue(metric, comp.hrStats[metric], best.hrStats[metric])) {
        best = comp;
      }
    }
    return best.benchmarkDeviceType;
  };

  const getBenchmarkChartData = () => {
    return benchmarkComparisons.map(comp => ({
      name: comp.benchmarkDeviceType.charAt(0).toUpperCase() + comp.benchmarkDeviceType.slice(1),
      value: comp.hrStats[selectedBenchmarkMetric],
      sessions: comp.totalSessions,
    }));
  };

  return (
    <div className="space-y-6">
      <Card title="Benchmark Device Comparison">
        {benchmarkComparisons.length > 0 ? (
          <>
            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Benchmark</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Sessions</th>
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
                      <div className="flex items-center justify-center gap-1" title="Relative percentage error">
                        MAPE <span className="text-red-500">↓</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1" title="Signal similarity">
                        Pearson <span className="text-green-500">↑</span>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <div className="flex items-center justify-center gap-1" title="Systematic over/under reading">
                        Bias
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkComparisons.map((comp) => {
                    const bestMAE = comp.benchmarkDeviceType === getBestPerformer('avgMAE');
                    const bestRMSE = comp.benchmarkDeviceType === getBestPerformer('avgRMSE');
                    const bestMAPE = comp.benchmarkDeviceType === getBestPerformer('avgMAPE');
                    const bestPearson = comp.benchmarkDeviceType === getBestPerformer('avgPearson');
                    const bestBias = comp.benchmarkDeviceType === getBestPerformer('avgBias');
                    
                    return (
                      <tr key={comp._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-800 capitalize">
                          {comp.benchmarkDeviceType}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">
                          {comp.totalSessions}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestMAE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {comp.hrStats.avgMAE.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestRMSE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {comp.hrStats.avgRMSE.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestMAPE ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {comp.hrStats.avgMAPE.toFixed(2)}%
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestPearson ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {comp.hrStats.avgPearson.toFixed(3)}
                        </td>
                        <td className={`py-3 px-4 text-center font-semibold ${bestBias ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}>
                          {comp.hrStats.avgBias.toFixed(2)}
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
                  <div><span className="font-medium">MAPE:</span> Mean Absolute % Error | Lower is better | Target: &lt;10%</div>
                  <div><span className="font-medium">Pearson:</span> Correlation (-1 to 1) | Higher is better | Target: &gt;0.9</div>
                  <div><span className="font-medium">Bias:</span> Systematic error (BPM) | Closer to 0 is better | Target: ±2 BPM</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No benchmark data available</p>
            <p className="text-sm mt-2">Data will appear as sessions are recorded</p>
          </div>
        )}
      </Card>

      {/* Bar Chart Comparison */}
      {benchmarkComparisons.length > 0 && (
        <Card title="Visual Metric Comparison">
          <div className="space-y-4">
            {/* Metric Selector */}
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setSelectedBenchmarkMetric('avgMAE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBenchmarkMetric === 'avgMAE'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getBenchmarkMetricTooltip('avgMAE')}
              >
                MAE
              </button>
              <button
                onClick={() => setSelectedBenchmarkMetric('avgRMSE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBenchmarkMetric === 'avgRMSE'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getBenchmarkMetricTooltip('avgRMSE')}
              >
                RMSE
              </button>
              <button
                onClick={() => setSelectedBenchmarkMetric('avgMAPE')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBenchmarkMetric === 'avgMAPE'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getBenchmarkMetricTooltip('avgMAPE')}
              >
                MAPE
              </button>
              <button
                onClick={() => setSelectedBenchmarkMetric('avgPearson')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBenchmarkMetric === 'avgPearson'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getBenchmarkMetricTooltip('avgPearson')}
              >
                Pearson
              </button>
              <button
                onClick={() => setSelectedBenchmarkMetric('avgBias')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedBenchmarkMetric === 'avgBias'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={getBenchmarkMetricTooltip('avgBias')}
              >
                Bias
              </button>
            </div>

            {/* Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={getBenchmarkChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: getBenchmarkMetricLabel(selectedBenchmarkMetric), angle: -90, position: 'insideLeft', style: { fontSize: '12px' } }}
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
                        const formattedValue = selectedBenchmarkMetric === 'avgMAPE' 
                          ? `${Number(value).toFixed(2)}%`
                          : Number(value).toFixed(selectedBenchmarkMetric === 'avgPearson' ? 3 : 2);
                        return [formattedValue, getBenchmarkMetricLabel(selectedBenchmarkMetric)];
                      }
                      return [value, name || ''];
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
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center text-sm text-gray-600">
              {getBenchmarkMetricTooltip(selectedBenchmarkMetric)}
              {selectedBenchmarkMetric === 'avgPearson' ? ' (higher is better)' : ' (lower is better)'}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BenchmarkComparisonTab;
