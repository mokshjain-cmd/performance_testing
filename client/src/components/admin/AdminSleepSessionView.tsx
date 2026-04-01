import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';
import { HypnogramChart } from '../dashboard/sleep/HypnogramChart';
import { StageDurationChart } from '../dashboard/sleep/StageDurationChart';
import type { SleepEpoch, SleepStage } from '../../types/sleep.types';

interface StageSensitivitySpecificity {
  AWAKE: number;
  LIGHT: number;
  DEEP: number;
  REM: number;
}

interface ConfusionMatrix {
  AWAKE: Record<string, number>;
  LIGHT: Record<string, number>;
  DEEP: Record<string, number>;
  REM: Record<string, number>;
}

interface AdminSessionSummary {
  sessionId: string;
  userId: string;
  userName?: string;
  date: string;
  firmwareVersion?: string;
  benchmarkDeviceType?: string;
  sessionStartTime: string;
  sessionEndTime: string;
  
  luna: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    deepSec: number;
    lightSec: number;
    remSec: number;
    awakeSec: number;
    sleepEfficiencyPercent: number;
    sleepOnsetTime?: string;
    finalWakeTime?: string;
  };
  
  benchmark?: {
    totalSleepTimeSec: number;
    timeInBedSec: number;
    deepSec: number;
    lightSec: number;
    remSec: number;
    awakeSec: number;
    sleepOnsetTime?: string;
    finalWakeTime?: string;
  };
  
  accuracyPercent: number;
  kappaScore: number;
  deepBiasSec: number;
  remBiasSec: number;
  totalSleepBiasSec: number;
  stageSensitivity: StageSensitivitySpecificity;
  stageSpecificity: StageSensitivitySpecificity;
  confusionMatrix: ConfusionMatrix;
}

interface EpochDataRaw {
  luna: Array<{ timestamp: string; stage: string; durationSec: number }>;
  benchmark?: Array<{ timestamp: string; stage: string; durationSec: number }>;
}

interface AdminSleepSessionViewProps {
  sessionId: string;
}

const AdminSleepSessionView: React.FC<AdminSleepSessionViewProps> = ({ sessionId }) => {
  const [sessionSummary, setSessionSummary] = useState<AdminSessionSummary | null>(null);
  const [lunaEpochs, setLunaEpochs] = useState<SleepEpoch[]>([]);
  const [benchmarkEpochs, setBenchmarkEpochs] = useState<SleepEpoch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Fetch session summary
    apiClient.get(`/sleep/admin/session/${sessionId}`)
      .then(res => {
        setSessionSummary(res.data.data);
      })
      .catch(err => {
        console.error('Error fetching admin session summary:', err);
      })
      .finally(() => setLoading(false));

    // Fetch epoch data for hypnogram
    apiClient.get<{ data: EpochDataRaw }>(`/sleep/hypnogram/${sessionId}`)
      .then(res => {
        const rawData = res.data.data;
        
        // Transform luna epochs
        const transformedLuna: SleepEpoch[] = (rawData.luna || []).map(e => ({
          timestamp: e.timestamp,
          stage: e.stage as SleepStage,
          durationSec: e.durationSec || 30,
          deviceType: 'luna',
        }));
        
        // Transform benchmark epochs
        const transformedBenchmark: SleepEpoch[] = (rawData.benchmark || []).map(e => ({
          timestamp: e.timestamp,
          stage: e.stage as SleepStage,
          durationSec: e.durationSec || 30,
          deviceType: 'benchmark',
        }));
        
        setLunaEpochs(transformedLuna);
        setBenchmarkEpochs(transformedBenchmark);
      })
      .catch(err => {
        console.error('Error fetching epoch data:', err);
      });
  }, [sessionId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getSensitivityColor = (value: number) => {
    // Values are percentages (0-100), not decimals
    if (value >= 80) return 'bg-green-100 text-green-800';
    if (value >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatTimeFromISO = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    // Extract time between T and Z from ISO string
    const match = isoString.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!sessionSummary) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>No session data available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Session Analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date</p>
              <p className="font-semibold">
                {new Date(sessionSummary.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">User</p>
              <p className="font-semibold">{sessionSummary.userName || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-gray-500">Firmware</p>
              <p className="font-semibold">{sessionSummary.firmwareVersion || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Benchmark Device</p>
              <p className="font-semibold">{sessionSummary.benchmarkDeviceType || 'N/A'}</p>
            </div>
          </div>
        </div>
      </Card>

      

      {/* Sleep Metrics Comparison - Horizontal Cards */}
      <Card>
        <h3 className="text-lg font-semibold mb-2">Sleep Metrics Comparison</h3>
        <p className="text-sm text-gray-600 mb-4">Side-by-side comparison of Falcon vs {sessionSummary.benchmarkDeviceType || 'Benchmark'}</p>
        
        {sessionSummary.benchmark ? (
          <div className="space-y-3">
            {/* Falcon Sleep Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200 shadow-sm">
              <div className="flex items-center gap-8">
                {/* Device Name */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="font-semibold text-gray-800 text-base">Falcon</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="grid grid-cols-7 flex-1 gap-2 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Sleep Onset</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTimeFromISO(sessionSummary.luna.sleepOnsetTime)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Final Wake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTimeFromISO(sessionSummary.luna.finalWakeTime)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Sleep</span>
                    <span className="font-semibold text-gray-800 text-base">{formatTime(sessionSummary.luna.totalSleepTimeSec)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.luna.deepSec)} <span className="text-xs text-gray-500">({((sessionSummary.luna.deepSec / sessionSummary.luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.luna.remSec)} <span className="text-xs text-gray-500">({((sessionSummary.luna.remSec / sessionSummary.luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.luna.lightSec)} <span className="text-xs text-gray-500">({((sessionSummary.luna.lightSec / sessionSummary.luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.luna.awakeSec)} <span className="text-xs text-gray-500">({((sessionSummary.luna.awakeSec / sessionSummary.luna.timeInBedSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Sleep Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-8">
                {/* Device Name */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="font-semibold text-gray-800 text-base">{sessionSummary.benchmarkDeviceType || 'Benchmark'}</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="grid grid-cols-8 flex-1 gap-2 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Sleep Onset</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTimeFromISO(sessionSummary.benchmark.sleepOnsetTime)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Final Wake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTimeFromISO(sessionSummary.benchmark.finalWakeTime)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Sleep</span>
                    <span className="font-semibold text-gray-800 text-base">{formatTime(sessionSummary.benchmark.totalSleepTimeSec)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.benchmark.deepSec)} <span className="text-xs text-gray-500">({((sessionSummary.benchmark.deepSec / sessionSummary.benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.benchmark.remSec)} <span className="text-xs text-gray-500">({((sessionSummary.benchmark.remSec / sessionSummary.benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.benchmark.lightSec)} <span className="text-xs text-gray-500">({((sessionSummary.benchmark.lightSec / sessionSummary.benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(sessionSummary.benchmark.awakeSec)} <span className="text-xs text-gray-500">({((sessionSummary.benchmark.awakeSec / sessionSummary.benchmark.timeInBedSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Efficiency</span>
                    <span className="font-semibold text-gray-800 text-base">
                      N/A
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Differences */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-8">
                {/* Section Title */}
                <div className="flex items-center gap-2 min-w-[100px]">
                  <span className="font-semibold text-gray-800 text-base">Differences</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="grid grid-cols-8 flex-1 gap-2 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Onset Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {sessionSummary.luna.sleepOnsetTime && sessionSummary.benchmark.sleepOnsetTime
                        ? (() => {
                            const diff = Math.round((new Date(sessionSummary.luna.sleepOnsetTime).getTime() - new Date(sessionSummary.benchmark.sleepOnsetTime).getTime()) / 60000);
                            return `${diff > 0 ? '+' : ''}${diff} min`;
                          })()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Wake Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {sessionSummary.luna.finalWakeTime && sessionSummary.benchmark.finalWakeTime
                        ? (() => {
                            const diff = Math.round((new Date(sessionSummary.luna.finalWakeTime).getTime() - new Date(sessionSummary.benchmark.finalWakeTime).getTime()) / 60000);
                            return `${diff > 0 ? '+' : ''}${diff} min`;
                          })()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Δ</span>
                    <span className={`font-semibold text-base ${
                      Math.abs(sessionSummary.totalSleepBiasSec) < 600 ? 'text-green-600' : 
                      Math.abs(sessionSummary.totalSleepBiasSec) < 1800 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sessionSummary.totalSleepBiasSec > 0 ? '+' : ''}
                      {formatTime(Math.abs(sessionSummary.totalSleepBiasSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep Δ</span>
                    <span className={`font-semibold text-base ${
                      Math.abs(sessionSummary.deepBiasSec) < 300 ? 'text-green-600' : 
                      Math.abs(sessionSummary.deepBiasSec) < 900 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sessionSummary.deepBiasSec > 0 ? '+' : ''}
                      {formatTime(Math.abs(sessionSummary.deepBiasSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM Δ</span>
                    <span className={`font-semibold text-base ${
                      Math.abs(sessionSummary.remBiasSec) < 300 ? 'text-green-600' : 
                      Math.abs(sessionSummary.remBiasSec) < 900 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sessionSummary.remBiasSec > 0 ? '+' : ''}
                      {formatTime(Math.abs(sessionSummary.remBiasSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light Δ</span>
                    <span className={`font-semibold text-base ${
                      Math.abs(sessionSummary.luna.lightSec - sessionSummary.benchmark.lightSec) < 600 ? 'text-green-600' : 
                      Math.abs(sessionSummary.luna.lightSec - sessionSummary.benchmark.lightSec) < 1200 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sessionSummary.luna.lightSec > sessionSummary.benchmark.lightSec ? '+' : ''}
                      {formatTime(Math.abs(sessionSummary.luna.lightSec - sessionSummary.benchmark.lightSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake Δ</span>
                    <span className={`font-semibold text-base ${
                      Math.abs(sessionSummary.luna.awakeSec - sessionSummary.benchmark.awakeSec) < 300 ? 'text-green-600' : 
                      Math.abs(sessionSummary.luna.awakeSec - sessionSummary.benchmark.awakeSec) < 600 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {sessionSummary.luna.awakeSec > sessionSummary.benchmark.awakeSec ? '+' : ''}
                      {formatTime(Math.abs(sessionSummary.luna.awakeSec - sessionSummary.benchmark.awakeSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">-</span>
                    <span className="font-semibold text-gray-800 text-base">
                      -
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interpretation Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">💡 Interpreting Sleep Differences:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li><span className="text-green-600 font-semibold">Green</span>: Excellent agreement - differences within clinical thresholds</li>
                <li><span className="text-yellow-600 font-semibold">Yellow</span>: Moderate difference - acceptable but worth monitoring</li>
                <li><span className="text-red-600 font-semibold">Red</span>: Significant difference - requires investigation</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No benchmark data available for comparison</p>
        )}
      </Card>

      

      {/* Stage-wise Bias */}
      {sessionSummary.benchmark && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Hypnogram Comparison</h3>
          <HypnogramChart
            lunaEpochs={lunaEpochs}
            benchmarkEpochs={benchmarkEpochs}
            showComparison={true}
          />
        </Card>
      )}

      {/* Validation Metrics */}
      {sessionSummary.benchmark && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Validation Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Epoch Accuracy</p>
              <p className={`text-3xl font-bold ${
                sessionSummary.accuracyPercent >= 85 ? 'text-green-600' : 
                sessionSummary.accuracyPercent >= 75 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {sessionSummary.accuracyPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: &gt;85%</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Cohen's Kappa</p>
              <p className={`text-3xl font-bold ${
                sessionSummary.kappaScore >= 0.8 ? 'text-green-600' : 
                sessionSummary.kappaScore >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {sessionSummary.kappaScore.toFixed(3)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Target: &gt;0.8</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-gray-600 mb-1">Total Sleep Bias</p>
              <p className={`text-3xl font-bold ${
                Math.abs(sessionSummary.totalSleepBiasSec) < 600 ? 'text-green-600' : 
                Math.abs(sessionSummary.totalSleepBiasSec) < 1800 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {sessionSummary.totalSleepBiasSec > 0 ? '+' : ''}{formatTime(Math.abs(sessionSummary.totalSleepBiasSec))}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {sessionSummary.totalSleepBiasSec > 0 ? 'Overestimation' : 'Underestimation'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-semibold mb-2">💡 Understanding These Metrics:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li><strong>Accuracy:</strong> Percentage of 30-second epochs where Falcon and benchmark agree on sleep stage</li>
              <li><strong>Cohen's Kappa:</strong> Agreement metric that accounts for chance. More reliable than simple accuracy</li>
              <li><strong>Bias:</strong> Systematic over/underestimation. Positive means Falcon detects more sleep</li>
            </ul>
          </div>
        </Card>
      )}

      {/* Stage Duration Breakdown */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Stage Duration Breakdown</h3>
        <StageDurationChart
          lunaData={{
            deep: sessionSummary.luna.deepSec,
            light: sessionSummary.luna.lightSec,
            rem: sessionSummary.luna.remSec,
            awake: sessionSummary.luna.awakeSec,
          }}
          benchmarkData={
            sessionSummary.benchmark
              ? {
                  deep: sessionSummary.benchmark.deepSec,
                  light: sessionSummary.benchmark.lightSec,
                  rem: sessionSummary.benchmark.remSec,
                  awake: sessionSummary.benchmark.awakeSec,
                }
              : undefined
          }
          showComparison={!!sessionSummary.benchmark}
        />
      </Card>

      {/* Stage Sensitivity */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Stage Sensitivity (True Positive Rate)</h3>
        <p className="text-sm text-gray-600 mb-4">
          How well Falcon detects each sleep stage when it's actually present
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {Object.entries(sessionSummary.stageSensitivity).map(([stage, value]) => (
            <div 
              key={stage} 
              className={`text-center p-4 rounded-lg ${getSensitivityColor(value)}`}
            >
              <p className="text-sm font-medium mb-1">{stage}</p>
              <p className="text-2xl font-bold">{value.toFixed(1)}%</p>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-green-900">
          <p className="font-semibold mb-2">💡 Understanding Sensitivity:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>What it measures:</strong> Of all the times the benchmark detected a stage, what % did Falcon correctly identify?</li>
            <li><strong>&gt;80%</strong> (Green): Excellent detection</li>
            <li><strong>60-80%</strong> (Yellow): Moderate detection</li>
            <li><strong>&lt;60%</strong> (Red): Poor detection, missing many occurrences</li>
          </ul>
        </div>
      </Card>

      {/* Stage Specificity */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Stage Specificity (True Negative Rate)</h3>
        <p className="text-sm text-gray-600 mb-4">
          How well Falcon avoids false positives for each sleep stage
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {Object.entries(sessionSummary.stageSpecificity).map(([stage, value]) => (
            <div 
              key={stage} 
              className={`text-center p-4 rounded-lg ${getSensitivityColor(value)}`}
            >
              <p className="text-sm font-medium mb-1">{stage}</p>
              <p className="text-2xl font-bold">{value.toFixed(1)}%</p>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-900">
          <p className="font-semibold mb-2">💡 Understanding Specificity:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li><strong>What it measures:</strong> Of all the times benchmark did NOT detect a stage, what % did Falcon correctly NOT identify?</li>
            <li><strong>&gt;80%</strong>: Excellent - avoids false alarms</li>
            <li><strong>60-80%</strong>: Moderate - some false detections</li>
            <li><strong>&lt;60%</strong>: Poor - too many false positives</li>
          </ul>
        </div>
      </Card>

      {/* Confusion Matrix */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Confusion Matrix</h3>
        <p className="text-sm text-gray-600 mb-4">
          Rows: {sessionSummary.benchmarkDeviceType || 'Benchmark'} (Ground Truth) | Columns: Falcon (Predictions)
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  {sessionSummary.benchmarkDeviceType || 'Benchmark'} \ Falcon
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">AWAKE</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">LIGHT</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">DEEP</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">REM</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(sessionSummary.confusionMatrix).map(([benchmarkStage, predictions]) => (
                <tr key={benchmarkStage}>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{benchmarkStage}</td>
                  {['AWAKE', 'LIGHT', 'DEEP', 'REM'].map(lunaStage => {
                    const count = predictions[lunaStage] || 0;
                    const isCorrect = benchmarkStage === lunaStage;
                    return (
                      <td 
                        key={lunaStage} 
                        className={`px-4 py-2 text-sm text-center ${
                          isCorrect ? 'bg-green-50 font-bold text-green-900' : 'text-gray-600'
                        }`}
                      >
                        {count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          <p className="font-semibold mb-2">📊 How to Read the Confusion Matrix:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li><span className="bg-green-100 px-1 rounded font-semibold">Green diagonal</span> = Correct predictions (Falcon and {sessionSummary.benchmarkDeviceType || 'benchmark'} agree)</li>
            <li><strong>Off-diagonal values</strong> = Misclassifications (disagreements between devices)</li>
            <li><strong>Row reading:</strong> When {sessionSummary.benchmarkDeviceType || 'benchmark'} says "DEEP", how does Falcon classify those epochs?</li>
            <li><strong>Common patterns:</strong> Light ↔ Deep confusion is typical, Awake ↔ REM suggests sensor issues</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default AdminSleepSessionView;
