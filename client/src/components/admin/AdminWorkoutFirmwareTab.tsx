import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { getAdminWorkoutFirmwarePerformance } from '../../services/workout.service';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface FirmwareData {
  firmwareVersion: string;
  totalSessions: number;
  totalUsers: number;
  // Backend returns overallAccuracy with PascalCase fields
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgMAPE?: number;
    avgPearson?: number;
  };
  workoutStats?: {
    avgHrMae?: number;
    avgHrPearson?: number;
    avgCaloriesBias?: number;
    avgStepsBias?: number;
    avgDistanceBias?: number;
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

const getTrendIcon = (current: number, previous: number | undefined, lowerIsBetter: boolean = true) => {
  if (!previous) return <Minus size={14} className="text-gray-400" />;
  
  const improved = lowerIsBetter ? current < previous : current > previous;
  const worsened = lowerIsBetter ? current > previous : current < previous;
  
  if (improved) return <TrendingDown size={14} className="text-green-500" />;
  if (worsened) return <TrendingUp size={14} className="text-red-500" />;
  return <Minus size={14} className="text-gray-400" />;
};

const AdminWorkoutFirmwareTab: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwareData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFirmware, setExpandedFirmware] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAdminWorkoutFirmwarePerformance();
        // Sort by version descending (newest first)
        const sorted = (data || []).sort((a: FirmwareData, b: FirmwareData) => 
          b.firmwareVersion.localeCompare(a.firmwareVersion, undefined, { numeric: true })
        );
        setFirmwareData(sorted);
      } catch (err: any) {
        console.error('Error fetching firmware data:', err);
        setError(err.message || 'Failed to load firmware data');
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

  if (firmwareData.length === 0) {
    return (
      <div className="text-center py-12">
        <Info size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">No firmware performance data available</p>
        <p className="text-gray-400 text-sm mt-2">
          Data will appear when workout sessions are recorded with different firmware versions
        </p>
      </div>
    );
  }

  // Get latest firmware for highlighting
  const latestFirmware = firmwareData[0]?.firmwareVersion;

  return (
    <div className="space-y-6">
      <Card title="Workout HR Accuracy by Firmware Version">
        <p className="text-sm text-gray-500 mb-4">
          Track workout HR accuracy improvements across firmware releases
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Firmware Version
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workouts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
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
                  Cal Bias
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Steps Bias
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dist Bias
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {firmwareData.map((fw, index) => {
                const prevFw = firmwareData[index + 1];
                const isLatest = fw.firmwareVersion === latestFirmware;
                const isExpanded = expandedFirmware === fw.firmwareVersion;
                const mae = fw.overallAccuracy?.avgMAE;
                const rmse = fw.overallAccuracy?.avgRMSE;
                const mape = fw.overallAccuracy?.avgMAPE;
                const pearson = fw.overallAccuracy?.avgPearson;
                const prevMae = prevFw?.overallAccuracy?.avgMAE;
                const prevRmse = prevFw?.overallAccuracy?.avgRMSE;
                const prevMape = prevFw?.overallAccuracy?.avgMAPE;
                const prevPearson = prevFw?.overallAccuracy?.avgPearson;
                const calBias = fw.workoutStats?.avgCaloriesBias;
                const stepsBias = fw.workoutStats?.avgStepsBias;
                const distBias = fw.workoutStats?.avgDistanceBias;
                
                return (
                  <React.Fragment key={fw.firmwareVersion}>
                    <tr className={`hover:bg-gray-50 ${isLatest ? 'bg-purple-50' : ''}`}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {fw.firmwareVersion}
                          </span>
                          {isLatest && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {fw.totalSessions}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {fw.totalUsers || '--'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-semibold ${mae !== undefined ? getAccuracyColor(mae) : 'text-gray-400'}`}>
                            {mae?.toFixed(2) || '--'}
                          </span>
                          {mae !== undefined && getTrendIcon(mae, prevMae, true)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-600">{rmse?.toFixed(2) || '--'}</span>
                          {rmse !== undefined && getTrendIcon(rmse, prevRmse, true)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          {mape !== undefined ? `${mape.toFixed(2)}%` : '--'}
                          {mape !== undefined && getTrendIcon(mape, prevMape, true)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-semibold ${
                            pearson !== undefined ? (
                              pearson >= 0.9 ? 'text-green-600' : 
                              pearson >= 0.8 ? 'text-yellow-600' : 'text-red-600'
                            ) : 'text-gray-400'
                          }`}>
                            {pearson?.toFixed(3) || '--'}
                          </span>
                          {pearson !== undefined && getTrendIcon(pearson, prevPearson, false)}
                        </div>
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        calBias !== undefined ? (calBias >= 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-400'
                      }`}>
                        {calBias !== undefined ? `${calBias >= 0 ? '+' : ''}${calBias.toFixed(1)}` : '--'}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        stepsBias !== undefined ? (stepsBias >= 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-400'
                      }`}>
                        {stepsBias !== undefined ? `${stepsBias >= 0 ? '+' : ''}${Math.round(stepsBias)}` : '--'}
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                        distBias !== undefined ? (distBias >= 0 ? 'text-red-500' : 'text-blue-500') : 'text-gray-400'
                      }`}>
                        {distBias !== undefined ? `${distBias >= 0 ? '+' : ''}${distBias.toFixed(0)}m` : '--'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {fw.sportTypeBreakdown && fw.sportTypeBreakdown.length > 0 && (
                          <button
                            onClick={() => setExpandedFirmware(isExpanded ? null : fw.firmwareVersion)}
                            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          >
                            {isExpanded ? 'Hide' : 'Show'} Sport Breakdown
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded sport type breakdown */}
                    {isExpanded && fw.sportTypeBreakdown && (
                      <tr>
                        <td colSpan={11} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {fw.sportTypeBreakdown.map((sport) => (
                              <div 
                                key={sport.sportType}
                                className="p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="text-sm font-medium text-gray-700">{sport.sportName}</div>
                                <div className="text-xs text-gray-500 mt-1">{sport.sessions} workouts</div>
                                <div className="flex justify-between mt-2">
                                  <span className={`text-xs font-semibold ${getAccuracyColor(sport.avgMae)}`}>
                                    MAE: {sport.avgMae?.toFixed(1)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    R: {sport.avgPearsonR?.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Interpretation */}
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-purple-800 mb-1">Tracking Firmware Improvements</h4>
            <p className="text-xs text-purple-700">
              Arrows indicate improvement (green ↓) or regression (red ↑) compared to previous firmware version.
              For MAE/RMSE/MAPE, lower is better. For Pearson R, higher is better.
              <strong className="block mt-1">Targets:</strong> MAE &lt; 5 BPM, Pearson R &gt; 0.90.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkoutFirmwareTab;
