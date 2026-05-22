import React from 'react';
import { CheckCircle, AlertCircle, Info, Flame, TrendingUp, Footprints, Heart, Activity } from 'lucide-react';

interface BenchmarkComparison {
  benchmarkDevice: string;
  // Luna HR summary
  lunaHrAvg?: number;
  lunaHrMax?: number;
  lunaHrMin?: number;
  // Benchmark HR summary
  benchmarkHrAvg?: number;
  benchmarkHrMax?: number;
  benchmarkHrMin?: number;
  // HR comparison metrics
  hrMae: number;
  hrRmse: number;
  hrMape: number;
  hrPearsonR: number;
  hrMeanBias: number;
  overlapCount: number;
  overlapPercent: number;
  // Workout-level comparisons
  lunaCalories?: number;
  benchmarkCalories?: number;
  caloriesDifference?: number;
  caloriesBias?: number;
  caloriesAccuracyPercent?: number;
  lunaDistance?: number;
  benchmarkDistance?: number;
  distanceDifference?: number;
  distanceAccuracyPercent?: number;
  lunaSteps?: number;
  benchmarkSteps?: number;
  stepsDifference?: number;
  stepsAccuracyPercent?: number;
}

interface WorkoutComparisonCardProps {
  comparison?: BenchmarkComparison;
}

type AccuracyStatus = {
  status: 'good' | 'moderate' | 'poor';
  label: string;
  score: number;
};

export const getAccuracyStatus = (
  mae: number,
  rmse: number,
  pearsonR: number
): AccuracyStatus => {
  let score = 0;

  /**
   * MAE (most important)
   */
  if (mae <= 5) score += 40;
  else if (mae <= 8) score += 25;
  else if (mae <= 12) score += 10;

  /**
   * RMSE
   */
  if (rmse <= 7) score += 30;
  else if (rmse <= 10) score += 20;
  else if (rmse <= 15) score += 10;

  /**
   * Pearson Correlation
   */
  if (pearsonR >= 0.9) score += 30;
  else if (pearsonR >= 0.75) score += 20;
  else if (pearsonR >= 0.6) score += 10;

  /**
   * Final Classification
   */
  if (score >= 75) {
    return {
      status: 'good',
      label: 'Excellent',
      score,
    };
  }

  if (score >= 45) {
    return {
      status: 'moderate',
      label: 'Good',
      score,
    };
  }

  return {
    status: 'poor',
    label: 'Needs Review',
    score,
  };
};

const statusColors = {
  good: 'text-green-600 bg-green-50 border-green-200',
  moderate: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  poor: 'text-red-600 bg-red-50 border-red-200',
};

const statusIcons = {
  good: CheckCircle,
  moderate: AlertCircle,
  poor: AlertCircle,
};

export const WorkoutComparisonCard: React.FC<WorkoutComparisonCardProps> = ({ comparison }) => {
  // Luna-only mode - no benchmark provided
  if (!comparison) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Accuracy Comparison</h3>
        <div className="text-center py-8">
          <Info size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No benchmark device data available</p>
          <p className="text-gray-400 text-xs mt-1">
            Upload benchmark device data to see accuracy comparison
          </p>
        </div>
      </div>
    );
  }

  const accuracy = getAccuracyStatus(comparison.hrMae, comparison.hrRmse, comparison.hrPearsonR);
  const StatusIcon = statusIcons[accuracy.status];

  const metrics = [
    {
      label: 'MAE',
      value: comparison.hrMae?.toFixed(2) || '--',
      unit: 'BPM',
      description: 'Mean Absolute Error',
      target: '< 5 BPM',
      isGood: comparison.hrMae <= 5,
    },
    {
      label: 'RMSE',
      value: comparison.hrRmse?.toFixed(2) || '--',
      unit: 'BPM',
      description: 'Root Mean Square Error',
      target: '< 7 BPM',
      isGood: comparison.hrRmse <= 7,
    },
    {
      label: 'MAPE',
      value: comparison.hrMape?.toFixed(2) || '--',
      unit: '%',
      description: 'Mean Absolute % Error',
      target: '< 10%',
      isGood: comparison.hrMape <= 10,
    },
    {
      label: 'Pearson R',
      value: comparison.hrPearsonR?.toFixed(3) || '--',
      unit: '',
      description: 'Correlation coefficient',
      target: '> 0.9',
      isGood: comparison.hrPearsonR >= 0.9,
    },
    {
      label: 'Mean Bias',
      value: comparison.hrMeanBias?.toFixed(2) || '--',
      unit: 'BPM',
      description: 'Systematic error',
      target: '± 2 BPM',
      isGood: Math.abs(comparison.hrMeanBias) <= 2,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Accuracy Comparison</h3>
        <span className="text-sm text-gray-500">
          vs {comparison.benchmarkDevice}
        </span>
      </div>

      {/* Overall Status */}
      <div className={`flex items-center gap-3 p-4 rounded-lg border mb-6 ${statusColors[accuracy.status]}`}>
        <StatusIcon size={24} />
        <div>
          <div className="font-semibold">{accuracy.label} Accuracy</div>
          <div className="text-xs opacity-80">
            {comparison.overlapCount?.toLocaleString()} matched readings ({comparison.overlapPercent?.toFixed(1)}% overlap)
          </div>
        </div>
      </div>

      {/* HR Summary Comparison - Luna vs Benchmark */}
      {(comparison.lunaHrAvg !== undefined || comparison.benchmarkHrAvg !== undefined) && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Heart size={16} className="text-red-500" />
            Heart Rate Summary
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Luna HR */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-sm font-medium text-blue-700 mb-3 flex items-center gap-2">
                <Activity size={14} />
                Luna
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Avg HR</span>
                  <span className="font-bold text-gray-900">{comparison.lunaHrAvg?.toFixed(0) || '--'} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Max HR</span>
                  <span className="font-semibold text-gray-800">{comparison.lunaHrMax || '--'} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Min HR</span>
                  <span className="font-semibold text-gray-800">{comparison.lunaHrMin || '--'} bpm</span>
                </div>
              </div>
            </div>
            
            {/* Benchmark HR */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                <Activity size={14} />
                {comparison.benchmarkDevice}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Avg HR</span>
                  <span className="font-bold text-gray-900">{comparison.benchmarkHrAvg?.toFixed(0) || '--'} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Max HR</span>
                  <span className="font-semibold text-gray-800">{comparison.benchmarkHrMax || '--'} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Min HR</span>
                  <span className="font-semibold text-gray-800">{comparison.benchmarkHrMin || '--'} bpm</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* HR Bias Summary */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Average HR Bias</span>
              <span className={`font-semibold ${
                Math.abs(comparison.hrMeanBias) <= 2 ? 'text-green-600' :
                Math.abs(comparison.hrMeanBias) <= 5 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {comparison.hrMeanBias >= 0 ? '+' : ''}{comparison.hrMeanBias?.toFixed(1)} bpm
                <span className="text-gray-500 font-normal ml-1">
                  ({comparison.hrMeanBias >= 0 ? 'Luna reads higher' : 'Luna reads lower'})
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Advanced HR Comparison Metrics */}
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Advanced HR Comparison</h4>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <div 
            key={metric.label}
            className={`p-3 rounded-lg border ${
              metric.isGood 
                ? 'bg-green-50 border-green-100' 
                : 'bg-gray-50 border-gray-100'
            }`}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">{metric.value}</span>
              <span className="text-xs text-gray-500">{metric.unit}</span>
            </div>
            <div className="text-xs font-medium text-gray-700 mt-1">{metric.label}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Target: {metric.target}
            </div>
          </div>
        ))}
      </div>

      {/* Interpretation Guide */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Info size={14} />
          <span>
            <strong>MAE</strong> measures average deviation, <strong>Pearson R</strong> measures correlation strength.
            Green metrics meet the target threshold.
          </span>
        </div>
      </div>

      {/* Workout Stats Comparison */}
      {(comparison.benchmarkCalories !== undefined || 
        comparison.benchmarkDistance !== undefined || 
        comparison.benchmarkSteps !== undefined) && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">Workout Stats Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Calories Comparison */}
            {comparison.benchmarkCalories !== undefined && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={18} className="text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Calories</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Luna:</span>
                    <span className="font-semibold">{comparison.lunaCalories?.toFixed(0) || '--'} kcal</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{comparison.benchmarkDevice}:</span>
                    <span className="font-semibold">{comparison.benchmarkCalories?.toFixed(0)} kcal</span>
                  </div>
                  <div className="pt-2 border-t border-orange-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bias:</span>
                      <span className={`font-semibold ${
                        comparison.caloriesBias !== undefined && comparison.caloriesBias >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {comparison.caloriesBias !== undefined && comparison.caloriesBias >= 0 ? '+' : ''}
                        {comparison.caloriesBias?.toFixed(0) || '--'} kcal
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className={`font-semibold ${
                        comparison.caloriesAccuracyPercent && comparison.caloriesAccuracyPercent >= 90 
                          ? 'text-green-600' 
                          : comparison.caloriesAccuracyPercent && comparison.caloriesAccuracyPercent >= 80 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {comparison.caloriesAccuracyPercent?.toFixed(1) || '--'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Distance Comparison */}
            {comparison.benchmarkDistance !== undefined && (
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">Distance</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Luna:</span>
                    <span className="font-semibold">
                      {comparison.lunaDistance 
                        ? (comparison.lunaDistance >= 1000 
                            ? `${(comparison.lunaDistance / 1000).toFixed(2)} km`
                            : `${comparison.lunaDistance.toFixed(0)} m`)
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{comparison.benchmarkDevice}:</span>
                    <span className="font-semibold">
                      {comparison.benchmarkDistance >= 1000 
                        ? `${(comparison.benchmarkDistance / 1000).toFixed(2)} km`
                        : `${comparison.benchmarkDistance.toFixed(0)} m`}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-purple-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bias:</span>
                      <span className={`font-semibold ${
                        comparison.distanceDifference && comparison.distanceDifference >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {comparison.distanceDifference && comparison.distanceDifference >= 0 ? '+' : ''}
                        {comparison.distanceDifference 
                          ? (Math.abs(comparison.distanceDifference) >= 1000 
                              ? `${(comparison.distanceDifference / 1000).toFixed(2)} km`
                              : `${comparison.distanceDifference.toFixed(0)} m`)
                          : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className={`font-semibold ${
                        comparison.distanceAccuracyPercent && comparison.distanceAccuracyPercent >= 90 
                          ? 'text-green-600' 
                          : comparison.distanceAccuracyPercent && comparison.distanceAccuracyPercent >= 80 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {comparison.distanceAccuracyPercent?.toFixed(1) || '--'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Steps Comparison */}
            {comparison.benchmarkSteps !== undefined && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <Footprints size={18} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-700">Steps</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Luna:</span>
                    <span className="font-semibold">{comparison.lunaSteps?.toLocaleString() || '--'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{comparison.benchmarkDevice}:</span>
                    <span className="font-semibold">{comparison.benchmarkSteps?.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-green-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Bias:</span>
                      <span className={`font-semibold ${
                        comparison.stepsDifference && comparison.stepsDifference >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {comparison.stepsDifference && comparison.stepsDifference >= 0 ? '+' : ''}
                        {comparison.stepsDifference?.toLocaleString() || '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className={`font-semibold ${
                        comparison.stepsAccuracyPercent && comparison.stepsAccuracyPercent >= 90 
                          ? 'text-green-600' 
                          : comparison.stepsAccuracyPercent && comparison.stepsAccuracyPercent >= 80 
                            ? 'text-yellow-600' 
                            : 'text-red-600'
                      }`}>
                        {comparison.stepsAccuracyPercent?.toFixed(1) || '--'}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutComparisonCard;
