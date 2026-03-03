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

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
              {formatDateTime(new Date(luna.sleepOnsetTime).getTime() / 1000)} - {formatDateTime(new Date(luna.finalWakeTime).getTime() / 1000)}
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

      {/* Luna Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Luna Sleep Metrics</h2>
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
            Comparison with Benchmark Device
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SleepMetricCard
              title="Agreement"
              value={sessionData.comparison.agreementPercent.toFixed(1)}
              unit="%"
              subtitle="Epoch-by-epoch match"
            />
            <SleepMetricCard
              title="Total Sleep Diff"
              value={formatTime(Math.abs(luna.totalSleepTimeSec - benchmark.totalSleepTimeSec))}
              subtitle={
                luna.totalSleepTimeSec > benchmark.totalSleepTimeSec
                  ? 'Luna longer'
                  : 'Luna shorter'
              }
            />
            <SleepMetricCard
              title="Deep Sleep Diff"
              value={formatTime(Math.abs(luna.deepSec - benchmark.deepSec))}
              subtitle={luna.deepSec > benchmark.deepSec ? 'Luna more' : 'Luna less'}
            />
            <SleepMetricCard
              title="REM Sleep Diff"
              value={formatTime(Math.abs(luna.remSec - benchmark.remSec))}
              subtitle={luna.remSec > benchmark.remSec ? 'Luna more' : 'Luna less'}
            />
          </div>
        </div>
      )}

      {/* Hypnogram */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Sleep Hypnogram</h2>
        <HypnogramChart
          lunaEpochs={sessionData.epochs.luna}
benchmarkEpochs={hasBenchmark ? sessionData.epochs.benchmark : undefined}
          showComparison={hasBenchmark}
        />
      </div>

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
