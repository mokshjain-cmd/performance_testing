import React, { useEffect, useState } from 'react';
import { Moon, Activity } from 'lucide-react';
import { HypnogramChart } from './sleep/HypnogramChart';
import { StageDurationChart } from './sleep/StageDurationChart';
import { sleepService } from '../../services/sleep.service';
import type { UserSingleSessionView } from '../../types/sleep.types';
import Loader from '../common/Loader';

interface SleepSessionsTabProps {
  sessionId: string | null;
}

const SleepSessionsTab: React.FC<SleepSessionsTabProps> = ({ sessionId }) => {
  const [sessionData, setSessionData] = useState<UserSingleSessionView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        setSessionData(null);
        return;
      }

      try {
        setLoading(true);
        const data = await sleepService.getUserSessionView({ sessionId, includeEpochs: true });
        setSessionData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching session data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session data');
        setSessionData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (loading) return <Loader />;

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Moon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Select a sleep session to view details</p>
        </div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-red-600">{error || 'Failed to load session data'}</p>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (dateString: string) => {
    // Extract date and time from ISO string without timezone conversion
    // Format: 2026-03-03T00:26:00.000Z -> Mar 3, 00:26
    const [datePart, timePart] = dateString.split('T');
    const timeOnly = timePart.split('.')[0]; // Remove milliseconds and Z
    const [, month, day] = datePart.split('-');
    const [hours, minutes] = timeOnly.split(':');
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[parseInt(month, 10) - 1];
    
    return `${monthName} ${parseInt(day, 10)}, ${hours}:${minutes}`;
  };

  const formatUTCTime = (dateString: string) => {
    // Extract time from ISO string without timezone conversion
    // Format: 2026-03-03T05:56:00.000Z -> 05:56 AM
    const timePart = dateString.split('T')[1];
    const timeOnly = timePart.split('.')[0]; // Remove milliseconds and Z
    const [hours, minutes] = timeOnly.split(':');
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const formattedHour = hour12.toString().padStart(2, '0');
    
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const { luna, benchmark } = sessionData;
  const hasBenchmark = !!benchmark;

  return (
    <div className="space-y-6">
      {/* Session Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sleep Session Details</h2>
            <p className="text-gray-600 mt-1">
              {sessionData.session?.name || 'Sleep Session'}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-medium">Sleep Period:</span>{' '}
              {formatDateTime(luna.sleepOnsetTime)} - {formatDateTime(luna.finalWakeTime)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sleep onset to final wake time (Luna measured)
            </p>
            {hasBenchmark && (
              <p className="text-sm text-green-600 mt-2">
                ✓ Benchmark comparison available ({benchmark.deviceType})
              </p>
            )}
          </div>
          <Moon className="w-10 h-10 text-indigo-500" />
        </div>
      </div>

      {/* Sleep Metrics Comparison */}
      {hasBenchmark && benchmark ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Sleep Statistics</h2>
          <div className="space-y-3">
            {/* Luna Sleep Stats */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200 shadow-sm">
              <div className="flex items-center justify-between gap-8">
                {/* Device Name */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Moon className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-800 text-base">Luna</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="flex items-center justify-around flex-1 gap-4 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Sleep Onset</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.sleepOnsetTime ? formatUTCTime(luna.sleepOnsetTime) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Final Wake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.finalWakeTime ? formatUTCTime(luna.finalWakeTime) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Sleep</span>
                    <span className="font-semibold text-gray-800 text-base">{formatTime(luna.totalSleepTimeSec)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(luna.deepSec)} <span className="text-xs text-gray-500">({((luna.deepSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(luna.remSec)} <span className="text-xs text-gray-500">({((luna.remSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(luna.lightSec)} <span className="text-xs text-gray-500">({((luna.lightSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(luna.awakeSec)} <span className="text-xs text-gray-500">({((luna.awakeSec / luna.timeInBedSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Efficiency</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.sleepEfficiencyPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Sleep Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between gap-8">
                {/* Device Name */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800 text-base">{benchmark.deviceType}</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="flex items-center justify-around flex-1 gap-4 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Sleep Onset</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {benchmark.sleepOnsetTime ? formatUTCTime(benchmark.sleepOnsetTime) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Final Wake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {benchmark.finalWakeTime ? formatUTCTime(benchmark.finalWakeTime) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Sleep</span>
                    <span className="font-semibold text-gray-800 text-base">{formatTime(benchmark.totalSleepTimeSec)}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(benchmark.deepSec)} <span className="text-xs text-gray-500">({((benchmark.deepSec / benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(benchmark.remSec)} <span className="text-xs text-gray-500">({((benchmark.remSec / benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(benchmark.lightSec)} <span className="text-xs text-gray-500">({((benchmark.lightSec / benchmark.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {formatTime(benchmark.awakeSec)} <span className="text-xs text-gray-500">({((benchmark.awakeSec / benchmark.timeInBedSec) * 100).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Efficiency</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {benchmark.sleepEfficiencyPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Differences */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between gap-8">
                {/* Section Title */}
                <div className="flex items-center gap-2 min-w-[140px]">
                  <span className="font-semibold text-gray-800 text-base">Differences</span>
                </div>
                
                {/* Stats spread across full width */}
                <div className="flex items-center justify-around flex-1 gap-4 text-sm">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Onset Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.sleepOnsetTime && benchmark.sleepOnsetTime
                        ? (() => {
                            const diff = Math.round((new Date(luna.sleepOnsetTime).getTime() - new Date(benchmark.sleepOnsetTime).getTime()) / 60000);
                            return `${diff > 0 ? '+' : ''}${diff} min`;
                          })()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Wake Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.finalWakeTime && benchmark.finalWakeTime
                        ? (() => {
                            const diff = Math.round((new Date(luna.finalWakeTime).getTime() - new Date(benchmark.finalWakeTime).getTime()) / 60000);
                            return `${diff > 0 ? '+' : ''}${diff} min`;
                          })()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Total Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.totalSleepTimeSec > benchmark.totalSleepTimeSec ? '+' : ''}
                      {formatTime(Math.abs(luna.totalSleepTimeSec - benchmark.totalSleepTimeSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Deep Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.deepSec > benchmark.deepSec ? '+' : ''}
                      {formatTime(Math.abs(luna.deepSec - benchmark.deepSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">REM Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.remSec > benchmark.remSec ? '+' : ''}
                      {formatTime(Math.abs(luna.remSec - benchmark.remSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Light Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.lightSec > benchmark.lightSec ? '+' : ''}
                      {formatTime(Math.abs(luna.lightSec - benchmark.lightSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Awake Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.awakeSec > benchmark.awakeSec ? '+' : ''}
                      {formatTime(Math.abs(luna.awakeSec - benchmark.awakeSec))}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-600 text-xs font-medium">Efficiency Δ</span>
                    <span className="font-semibold text-gray-800 text-base">
                      {luna.sleepEfficiencyPercent > benchmark.sleepEfficiencyPercent ? '+' : ''}
                      {Math.abs(luna.sleepEfficiencyPercent - benchmark.sleepEfficiencyPercent).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)]">
          <h2 className="mb-3 text-xl font-semibold text-gray-800">Sleep Statistics</h2>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between gap-8">
              {/* Device Name */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <Moon className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-800 text-base">Luna</span>
              </div>
              
              {/* Stats spread across full width */}
              <div className="flex items-center justify-around flex-1 gap-4 text-sm">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Sleep Onset</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {luna.sleepOnsetTime ? formatUTCTime(luna.sleepOnsetTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Final Wake</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {luna.finalWakeTime ? formatUTCTime(luna.finalWakeTime) : 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Total Sleep</span>
                  <span className="font-semibold text-gray-800 text-base">{formatTime(luna.totalSleepTimeSec)}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Deep</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {formatTime(luna.deepSec)} <span className="text-xs text-gray-500">({((luna.deepSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">REM</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {formatTime(luna.remSec)} <span className="text-xs text-gray-500">({((luna.remSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Light</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {formatTime(luna.lightSec)} <span className="text-xs text-gray-500">({((luna.lightSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Awake</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {formatTime(luna.awakeSec)} <span className="text-xs text-gray-500">({((luna.awakeSec / luna.timeInBedSec) * 100).toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-gray-600 text-xs font-medium">Efficiency</span>
                  <span className="font-semibold text-gray-800 text-base">
                    {luna.sleepEfficiencyPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Metrics */}
      {hasBenchmark && benchmark && sessionData.comparison && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-2">Validation Metrics</h3>
          <p className="text-sm text-gray-600 mb-4">Statistical measures of Luna's accuracy against {benchmark.deviceType}</p>
          
          {/* Accuracy and Kappa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div 
              className={`p-6 rounded-lg ${
                sessionData.comparison.agreementPercent >= 80 
                  ? 'bg-green-50 border-2 border-green-300' 
                  : sessionData.comparison.agreementPercent >= 70 
                  ? 'bg-yellow-50 border-2 border-yellow-300' 
                  : 'bg-red-50 border-2 border-red-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-600 mb-1">Epoch-by-Epoch Accuracy</div>
              <div className={`text-3xl font-bold mb-2 ${
                sessionData.comparison.agreementPercent >= 80 
                  ? 'text-green-700' 
                  : sessionData.comparison.agreementPercent >= 70 
                  ? 'text-yellow-700' 
                  : 'text-red-700'
              }`}>
                {sessionData.comparison.agreementPercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-700 space-y-1">
                <p>• ≥80%: <span className="font-semibold text-green-700">Excellent agreement</span></p>
                <p>• 70-80%: <span className="font-semibold text-yellow-700">Good agreement</span></p>
                <p>• &lt;70%: <span className="font-semibold text-red-700">Needs improvement</span></p>
              </div>
            </div>

            <div className={`p-6 rounded-lg ${
              (sessionData.comparison.kappaScore || 0) >= 0.8 
                ? 'bg-green-50 border-2 border-green-300' 
                : (sessionData.comparison.kappaScore || 0) >= 0.6 
                ? 'bg-yellow-50 border-2 border-yellow-300' 
                : 'bg-red-50 border-2 border-red-300'
            }`}>
              <div className="text-sm font-medium text-gray-600 mb-1">Cohen's Kappa</div>
              <div className={`text-3xl font-bold mb-2 ${
                (sessionData.comparison.kappaScore || 0) >= 0.8 
                  ? 'text-green-700' 
                  : (sessionData.comparison.kappaScore || 0) >= 0.6 
                  ? 'text-yellow-700' 
                  : 'text-red-700'
              }`}>
                {sessionData.comparison.kappaScore?.toFixed(3) || 'N/A'}
              </div>
              <div className="text-xs text-gray-700 space-y-1">
                <p>• ≥0.8: <span className="font-semibold text-green-700">Almost perfect</span></p>
                <p>• 0.6-0.8: <span className="font-semibold text-yellow-700">Substantial</span></p>
                <p>• &lt;0.6: <span className="font-semibold text-red-700">Moderate or less</span></p>
                <p className="text-gray-600 mt-2">Accounts for chance agreement</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-semibold mb-2">📊 Understanding these metrics:</p>
            <p className="mb-2"><strong>Accuracy</strong>: Percentage of 30-second epochs where Luna and {benchmark.deviceType} agree on the sleep stage.</p>
            <p><strong>Cohen's Kappa</strong>: Statistical measure that accounts for agreement occurring by chance. Values closer to 1.0 indicate better reliability between devices.</p>
          </div>
        </div>
      )}

      {/* Hypnogram */}
      {sessionData.epochs && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Sleep Hypnogram</h3>
          <HypnogramChart
            lunaEpochs={sessionData.epochs.luna}
            benchmarkEpochs={hasBenchmark ? sessionData.epochs.benchmark : undefined}
            showComparison={hasBenchmark}
          />
        </div>
      )}

      {/* Show message if epochs not available */}
      {!sessionData.epochs && (
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">Hypnogram data is not available for this session.</p>
        </div>
      )}

      {/* Stage Duration Comparison */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Stage Duration Breakdown</h3>
        <StageDurationChart
          lunaData={{
            deep: luna.deepSec,
            light: luna.lightSec,
            rem: luna.remSec,
            awake: luna.awakeSec,
          }}
          benchmarkData={
            hasBenchmark && benchmark
              ? {
                  deep: benchmark.deepSec,
                  light: benchmark.lightSec,
                  rem: benchmark.remSec,
                  awake: benchmark.awakeSec,
                }
              : undefined
          }
          showComparison={hasBenchmark}
        />
      </div>
    </div>
  );
};

export default SleepSessionsTab;
