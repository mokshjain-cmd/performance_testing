import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SleepMetricCard } from '../components/dashboard/sleep/SleepMetricCard';
import { HypnogramChart } from '../components/dashboard/sleep/HypnogramChart';
import { ErrorTimeline } from '../components/dashboard/sleep/ErrorTimeline';
import { sleepService } from '../services/sleep.service';
import type { AdminSessionSummary } from '../types/sleep.types';

export const AdminSleepSessionPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<AdminSessionSummary | null>(null);
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
        const data = await sleepService.getAdminSessionSummary({ sessionId, includeEpochs: true });
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
        <div className="text-lg text-gray-600">Loading session analysis...</div>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-6">
        <Link
          to="/admin/sleep"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
        </Link>
        <div className="text-lg text-red-600">{error || 'No session data available'}</div>
      </div>
    );
  }

  const hasBenchmark = !!sessionData.session.benchmarkDevice;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <Link
          to="/admin/sleep"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Session Validation Analysis</h1>
            <p className="text-gray-600 mt-1">
              User: {sessionData.session.userId} | Session: {sessionData.session._id}
            </p>
            <p className="text-gray-600">
              Date: {sessionData.session.date}
            </p>
            <p className="text-gray-600">
              Firmware: {sessionData.session.firmwareVersion}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Session Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SleepMetricCard
            title="Firmware Version"
            value={sessionData.session.firmwareVersion}
          />
          {hasBenchmark && (
            <SleepMetricCard
              title="Benchmark Device"
              value={sessionData.session.benchmarkDevice}
            />
          )}
        </div>
      </div>

      

      {/* Stage-wise Performance */}
      {hasBenchmark && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Stage Detection Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Deep Sleep</h3>
              <div className="space-y-2">
                <SleepMetricCard
                  title="Sensitivity"
                  value={sessionData.stageSensitivity.DEEP.toFixed(1)}
                  unit="%"
                />
                <SleepMetricCard
                  title="Specificity"
                  value={sessionData.stageSpecificity.DEEP.toFixed(1)}
                  unit="%"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Light Sleep</h3>
              <div className="space-y-2">
                <SleepMetricCard
                  title="Sensitivity"
                  value={sessionData.stageSensitivity.LIGHT.toFixed(1)}
                  unit="%"
                />
                <SleepMetricCard
                  title="Specificity"
                  value={sessionData.stageSpecificity.LIGHT.toFixed(1)}
                  unit="%"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">REM Sleep</h3>
              <div className="space-y-2">
                <SleepMetricCard
                  title="Sensitivity"
                  value={sessionData.stageSensitivity.REM.toFixed(1)}
                  unit="%"
                />
                <SleepMetricCard
                  title="Specificity"
                  value={sessionData.stageSpecificity.REM.toFixed(1)}
                  unit="%"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Awake</h3>
              <div className="space-y-2">
                <SleepMetricCard
                  title="Sensitivity"
                  value={sessionData.stageSensitivity.AWAKE.toFixed(1)}
                  unit="%"
                />
                <SleepMetricCard
                  title="Specificity"
                  value={sessionData.stageSpecificity.AWAKE.toFixed(1)}
                  unit="%"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hypnogram Comparison */}
      {hasBenchmark && sessionData.epochs && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Hypnogram Comparison</h2>
          <HypnogramChart
            lunaEpochs={sessionData.epochs.luna}
            benchmarkEpochs={sessionData.epochs.benchmark}
            showComparison={true}
          />
        </div>
      )}

      {/* Validation Metrics */}
      {hasBenchmark && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Validation Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SleepMetricCard
              title="Accuracy"
              value={sessionData.metrics.accuracy.toFixed(1)}
              unit="%"
            />
            <SleepMetricCard
              title="Cohen's Kappa"
              value={sessionData.metrics.kappa.toFixed(3)}
            />
            <SleepMetricCard
              title="Deep Bias"
              value={`${(sessionData.metrics.deepBias / 60).toFixed(1)} min`}
              subtitle="Falcon - Benchmark"
            />
            <SleepMetricCard
              title="REM Bias"
              value={`${(sessionData.metrics.remBias / 60).toFixed(1)} min`}
              subtitle="Falcon - Benchmark"
            />
          </div>
        </div>
      )}

      {/* Confusion Matrix - Note: format is different */}
      {hasBenchmark && sessionData.confusionMatrix && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Confusion Matrix</h2>
          <p className="text-sm text-gray-600 mb-4">
            Shows how Falcon's predictions align with benchmark device readings.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Predicted
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percent
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sessionData.confusionMatrix.map((row, idx) => (
                  <tr
                    key={idx}
                    className={row.actual === row.predicted ? 'bg-green-50' : ''}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.predicted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {row.percent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error Timeline */}
      {hasBenchmark &&
        sessionData.epochs &&
        sessionData.epochs.luna.length === sessionData.epochs.benchmark.length && (
          <div className="bg-white p-6 rounded-lg shadow">
            <ErrorTimeline
              epochs={sessionData.epochs.luna.map((lunaEpoch, idx) => ({
                timestamp: new Date(lunaEpoch.timestamp).getTime() / 1000,
                lunaStage: lunaEpoch.stage,
                benchmarkStage: sessionData.epochs.benchmark[idx].stage,
                agreement: lunaEpoch.stage === sessionData.epochs.benchmark[idx].stage,
              }))}
            />
          </div>
        )}
    </div>
  );
};
