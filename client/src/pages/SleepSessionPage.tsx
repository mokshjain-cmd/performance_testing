import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Moon, Clock, Heart, Activity } from 'lucide-react';
import { SleepMetricCard } from '../components/dashboard/sleep/SleepMetricCard';
import { HypnogramChart } from '../components/dashboard/sleep/HypnogramChart';
import { StageDurationChart } from '../components/dashboard/sleep/StageDurationChart';
import { sleepService } from '../services/sleep.service';
import type { UserSingleSessionView } from '../types/sleep.types';

export const SleepSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<UserSingleSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await sleepService.getUserSessionView({ sessionId, includeEpochs: true });
        setSessionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading session data...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-6">
        <Link to="/sleep" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Overview
        </Link>
        <div className="text-lg text-red-600">{error || 'No session data available'}</div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy >= 85) return 'text-green-600 bg-green-50';
    if (accuracy >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getKappaColor = (kappa: number): string => {
    if (kappa >= 0.8) return 'text-green-600 bg-green-50';
    if (kappa >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatTimeFromISO = (isoString: string | undefined) => {
    if (!isoString) return 'N/A';
    // Extract time between T and Z from ISO string
    const match = isoString.match(/T(\d{2}:\d{2})/);
    return match ? match[1] : 'N/A';
  };

  const { luna, benchmark } = sessionData;
  const hasBenchmark = !!benchmark;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link to="/sleep" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Overview
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sleep Session</h1>
            <p className="text-gray-600 mt-1">
              {formatDateTime(luna.sleepOnsetTime)} - {formatDateTime(luna.finalWakeTime)}
            </p>
            {hasBenchmark && (
              <p className="text-sm text-green-600 mt-1">
                ✓ Benchmark comparison available
              </p>
            )}
          </div>
          <Moon className="w-12 h-12 text-blue-500" />
        </div>
      </div>

      {/* Sleep Timing */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Sleep Timing</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Falcon
                </th>
                {hasBenchmark && benchmark && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {benchmark.deviceType}
                  </th>
                )}
                {hasBenchmark && benchmark && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Difference
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Sleep Onset
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatTimeFromISO(luna.sleepOnsetTime)}
                </td>
                {hasBenchmark && benchmark && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatTimeFromISO(benchmark.sleepOnsetTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {luna.sleepOnsetTime && benchmark.sleepOnsetTime
                        ? `${Math.round((new Date(luna.sleepOnsetTime).getTime() - new Date(benchmark.sleepOnsetTime).getTime()) / 60000)} min`
                        : 'N/A'}
                    </td>
                  </>
                )}
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Final Wake
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {formatTimeFromISO(luna.finalWakeTime)}
                </td>
                {hasBenchmark && benchmark && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatTimeFromISO(benchmark.finalWakeTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {luna.finalWakeTime && benchmark.finalWakeTime
                        ? `${Math.round((new Date(luna.finalWakeTime).getTime() - new Date(benchmark.finalWakeTime).getTime()) / 60000)} min`
                        : 'N/A'}
                    </td>
                  </>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Falcon Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Falcon Sleep Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Total Sleep Time"
            value={formatTime(luna.totalSleepTimeSec)}
            icon={<Moon className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Time in Bed"
            value={formatTime(luna.timeInBedSec)}
            icon={<Clock className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Sleep Efficiency"
            value={luna.sleepEfficiencyPercent.toFixed(1)}
            unit="%"
            icon={<Activity className="w-6 h-6" />}
          />
          <SleepMetricCard
            title="Deep Sleep"
            value={formatTime(luna.deepSec)}
            subtitle={`${((luna.deepSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%`}
          />
          <SleepMetricCard
            title="Light Sleep"
            value={formatTime(luna.lightSec)}
            subtitle={`${((luna.lightSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%`}
          />
          <SleepMetricCard
            title="REM Sleep"
            value={formatTime(luna.remSec)}
            subtitle={`${((luna.remSec / luna.totalSleepTimeSec) * 100).toFixed(1)}%`}
          />
          <SleepMetricCard
            title="Awake Time"
            value={formatTime(luna.awakeSec)}
            subtitle={`${((luna.awakeSec / luna.timeInBedSec) * 100).toFixed(1)}% of time in bed`}
          />
          <SleepMetricCard
            title="Sleep Score"
            value={luna.sleepScore || 'N/A'}
            unit={luna.sleepScore ? '/100' : ''}
            icon={<Heart className="w-6 h-6" />}
          />
        </div>
      </div>

      {/* Benchmark Comparison Metrics */}
      {hasBenchmark && benchmark && sessionData.comparison && (
        <div>
          <h2 className="text-xl font-semibold mb-4">
            Comparison with Benchmark Device ({benchmark.deviceType})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className={`p-4 rounded-lg border-2 ${getAccuracyColor(sessionData.comparison.agreementPercent)}`}>
              <h3 className="text-sm font-medium mb-2">Agreement</h3>
              <p className="text-3xl font-bold">{sessionData.comparison.agreementPercent.toFixed(1)}%</p>
              <p className="text-sm mt-2">Epoch-by-epoch match</p>
            </div>
            <div className={`p-4 rounded-lg border-2 ${getKappaColor(sessionData.comparison.kappaScore)}`}>
              <h3 className="text-sm font-medium mb-2">Kappa Score</h3>
              <p className="text-3xl font-bold">{sessionData.comparison.kappaScore.toFixed(2)}</p>
              <p className="text-sm mt-2">
                {sessionData.comparison.kappaScore >= 0.8 ? 'Excellent' : 
                 sessionData.comparison.kappaScore >= 0.6 ? 'Good' : 'Fair'}
              </p>
            </div>
            <SleepMetricCard
              title="Total Sleep Diff"
              value={formatTime(Math.abs(sessionData.comparison.totalSleepDifferenceSec))}
              subtitle={
                sessionData.comparison.totalSleepDifferenceSec >= 0
                  ? 'Falcon overestimated'
                  : 'Falcon underestimated'
              }
            />
            <SleepMetricCard
              title="Deep Sleep Diff"
              value={formatTime(Math.abs(sessionData.comparison.deepDifferenceSec))}
              subtitle={sessionData.comparison.deepDifferenceSec >= 0 ? 'Falcon overestimated' : 'Falcon underestimated'}
            />
            <SleepMetricCard
              title="REM Sleep Diff"
              value={formatTime(Math.abs(sessionData.comparison.remDifferenceSec))}
              subtitle={sessionData.comparison.remDifferenceSec >= 0 ? 'Falcon overestimated' : 'Falcon underestimated'}
            />
          </div>
        </div>
      )}

      {/* Hypnogram */}
      {sessionData.epochs && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Sleep Hypnogram</h2>
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
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Stage Duration Breakdown</h2>
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
