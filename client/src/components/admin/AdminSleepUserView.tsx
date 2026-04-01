import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import apiClient from '../../services/api';

interface UserSleepSummary {
  userId: string;
  totalSessions: number;
  avgTotalSleepTimeSec: number;
  avgTimeInBedSec: number;
  avgDeepSec: number;
  avgLightSec: number;
  avgRemSec: number;
  avgAwakeSec: number;
  avgDeepPercent: number;
  avgLightPercent: number;
  avgRemPercent: number;
  avgAwakePercent: number;
  avgSleepEfficiencyPercent: number;
  avgEpochAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  avgTotalSleepBiasSec: number;
  bestSession?: {
    sessionId: string;
    sessionName: string;
    accuracyPercent: number;
    date: string;
  };
  worstSession?: {
    sessionId: string;
    sessionName: string;
    accuracyPercent: number;
    date: string;
  };
}

interface FirmwarePerformance {
  firmwareVersion: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface BenchmarkComparison {
  benchmarkDevice: string;
  avgAccuracyPercent: number;
  avgKappaScore: number;
  avgDeepBiasSec: number;
  avgRemBiasSec: number;
  totalSessions: number;
  stageSensitivity: {
    AWAKE: number;
    LIGHT: number;
    DEEP: number;
    REM: number;
  };
}

interface AdminSleepUserViewProps {
  userId: string;
}

const AdminSleepUserView: React.FC<AdminSleepUserViewProps> = ({ userId }) => {
  const [userSummary, setUserSummary] = useState<UserSleepSummary | null>(null);
  const [firmwareData, setFirmwareData] = useState<FirmwarePerformance[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkComparison[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // Fetch user summary
    const summaryPromise = apiClient.get(`/sleep/admin/user/${userId}`);
    
    // Fetch firmware comparison
    const firmwarePromise = apiClient.get(`/sleep/admin/user/${userId}/firmware-comparison`);
    
    // Fetch benchmark comparison
    const benchmarkPromise = apiClient.get(`/sleep/admin/user/${userId}/benchmark-comparison`);
    
    Promise.all([summaryPromise, firmwarePromise, benchmarkPromise])
      .then(([summaryRes, firmwareRes, benchmarkRes]) => {
        setUserSummary(summaryRes.data.data);
        setFirmwareData(firmwareRes.data.data || []);
        setBenchmarkData(benchmarkRes.data.data || []);
      })
      .catch(err => {
        console.error('Error fetching user sleep data:', err);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getAccuracyColor = (value: number | undefined) => {
    if (value == null) return 'text-gray-400';
    if (value >= 85) return 'text-green-600';
    if (value >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getKappaColor = (value: number | undefined) => {
    if (value == null) return 'text-gray-400';
    if (value >= 0.8) return 'text-green-600';
    if (value >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user sleep data...</p>
        </div>
      </div>
    );
  }

  if (!userSummary) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>No sleep data available for this user</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Sessions</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 bg-clip-text text-transparent">
              {userSummary.totalSessions}
            </p>
            <p className="text-xs text-gray-500">Sleep recordings analyzed</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Sleep Time</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {formatTime(userSummary.avgTotalSleepTimeSec)}
            </p>
            <p className="text-xs text-gray-500">Per session average</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Accuracy</p>
            <p className={`text-3xl font-bold ${getAccuracyColor(userSummary.avgEpochAccuracyPercent)}`}>
              {userSummary.avgEpochAccuracyPercent.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Epoch-level agreement</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Kappa Score</p>
            <p className={`text-3xl font-bold ${getKappaColor(userSummary.avgKappaScore)}`}>
              {userSummary.avgKappaScore.toFixed(3)}
            </p>
            <p className="text-xs text-gray-500">Agreement quality</p>
          </div>
        </Card>
      </div>

      {/* Average Sleep Metrics - Horizontal Card */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Average Sleep Metrics (Falcon)</h3>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-[100px] pr-4 border-r border-purple-300">
              <p className="text-sm font-semibold text-purple-700 uppercase">Falcon </p>
              <p className="text-xs text-purple-600">Avg per session</p>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Time in Bed</p>
                <p className="text-lg font-bold text-gray-900">{formatTime(userSummary.avgTimeInBedSec)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Total Sleep</p>
                <p className="text-lg font-bold text-gray-900">{formatTime(userSummary.avgTotalSleepTimeSec)}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-indigo-600 mb-1">Deep Sleep</p>
                <p className="text-lg font-bold text-indigo-900">{formatTime(userSummary.avgDeepSec)}</p>
                <p className="text-xs text-indigo-600 mt-0.5">{userSummary.avgDeepPercent.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-blue-600 mb-1">Light Sleep</p>
                <p className="text-lg font-bold text-blue-900">{formatTime(userSummary.avgLightSec)}</p>
                <p className="text-xs text-blue-600 mt-0.5">{userSummary.avgLightPercent.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-purple-600 mb-1">REM Sleep</p>
                <p className="text-lg font-bold text-purple-900">{formatTime(userSummary.avgRemSec)}</p>
                <p className="text-xs text-purple-600 mt-0.5">{userSummary.avgRemPercent.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-1">Awake Time</p>
                <p className="text-lg font-bold text-gray-900">{formatTime(userSummary.avgAwakeSec)}</p>
                <p className="text-xs text-gray-600 mt-0.5">{userSummary.avgAwakePercent.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Validation Metrics */}
      <Card>
        <h3 className="text-lg font-semibold mb-6">Validation Metrics</h3>
        
        {/* Main Metrics - Prominent Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Epoch Accuracy</p>
                <p className="text-xs text-gray-500 mt-0.5">30-second agreement rate</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${getAccuracyColor(userSummary.avgEpochAccuracyPercent)}`}>
                  {userSummary.avgEpochAccuracyPercent.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-blue-200">
              {userSummary.avgEpochAccuracyPercent >= 85 && <p className="text-sm text-green-700 font-semibold">Excellent: Clinical-grade accuracy</p>}
              {userSummary.avgEpochAccuracyPercent >= 75 && userSummary.avgEpochAccuracyPercent < 85 && <p className="text-sm text-yellow-700 font-semibold">Good: Approaching target</p>}
              {userSummary.avgEpochAccuracyPercent < 75 && <p className="text-sm text-red-700 font-semibold">Below target (&lt;85%)</p>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Cohen's Kappa</p>
                <p className="text-xs text-gray-500 mt-0.5">Statistical agreement</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${getKappaColor(userSummary.avgKappaScore)}`}>
                  {userSummary.avgKappaScore.toFixed(3)}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-purple-200">
              {userSummary.avgKappaScore >= 0.8 && <p className="text-sm text-green-700 font-semibold">Excellent agreement (&gt;0.8)</p>}
              {userSummary.avgKappaScore >= 0.6 && userSummary.avgKappaScore < 0.8 && <p className="text-sm text-yellow-700 font-semibold">Good agreement (0.6-0.8)</p>}
              {userSummary.avgKappaScore >= 0.4 && userSummary.avgKappaScore < 0.6 && <p className="text-sm text-orange-700 font-semibold">Moderate agreement (0.4-0.6)</p>}
              {userSummary.avgKappaScore < 0.4 && <p className="text-sm text-red-700 font-semibold">Poor agreement (&lt;0.4)</p>}
            </div>
          </div>
        </div>

        {/* Interpretation Guide - Collapsed */}
        <details className="group">
          <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center">
            <svg className="h-4 w-4 mr-1 transform group-open:rotate-90 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            What do these metrics mean?
          </summary>
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-900 space-y-2">
              <p><strong>Epoch Accuracy:</strong> Percentage of 30-second epochs where Falcon agrees with the benchmark device. Target: &gt;85% for clinical-grade accuracy.</p>
              <p><strong>Cohen's Kappa:</strong> Statistical measure of agreement beyond chance. &gt;0.8 = Excellent, 0.6-0.8 = Good, 0.4-0.6 = Moderate, &lt;0.4 = Poor.</p>
            </div>
          </div>
        </details>
      </Card>

      {/* Stage Bias Analysis */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Stage Bias Analysis (Falcon vs Benchmark)</h3>
        
        {/* Interpretation Guide */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-purple-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">Understanding Bias</h4>
              <div className="text-sm text-purple-800 space-y-1">
                <p><strong>Bias Direction:</strong> Up arrow (↑) means Falcon overestimates (detects more of that stage). Down arrow (↓) means Falcon underestimates (detects less).</p>
                <p><strong>Magnitude:</strong> Larger time differences indicate systematic bias. Small differences (&lt;10 min) are typically acceptable.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-purple-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Total Sleep Bias</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatTime(Math.abs(userSummary.avgTotalSleepBiasSec))}
                <span className="text-lg ml-2 text-gray-600">
                  {userSummary.avgTotalSleepBiasSec > 0 ? '↑' : '↓'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {userSummary.avgTotalSleepBiasSec > 0 ? 'Over-estimation' : 'Under-estimation'}
              </p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-600 mb-2">Deep Sleep Bias</p>
              <p className="text-2xl font-bold text-indigo-900">
                {formatTime(Math.abs(userSummary.avgDeepBiasSec))}
                <span className="text-lg ml-2 text-indigo-600">
                  {userSummary.avgDeepBiasSec > 0 ? '↑' : '↓'}
                </span>
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                {userSummary.avgDeepBiasSec > 0 ? 'Over-estimation' : 'Under-estimation'}
              </p>
            </div>

            <div className="text-center p-4 bg-white rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-2">REM Sleep Bias</p>
              <p className="text-2xl font-bold text-purple-900">
                {formatTime(Math.abs(userSummary.avgRemBiasSec))}
                <span className="text-lg ml-2 text-purple-600">
                  {userSummary.avgRemBiasSec > 0 ? '↑' : '↓'}
                </span>
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {userSummary.avgRemBiasSec > 0 ? 'Over-estimation' : 'Under-estimation'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Range - Best and Worst Sessions */}
      {(userSummary.bestSession || userSummary.worstSession) && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Performance Range</h3>
          <p className="text-sm text-gray-600 mb-4">
            Understanding the range between best and worst sessions helps identify consistency and factors affecting sleep tracking quality.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userSummary.bestSession && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-md font-semibold text-green-800">Best Session</h4>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 font-medium">
                    {userSummary.bestSession.sessionName}
                  </p>
                  <p className="text-3xl font-bold text-green-700">
                    {userSummary.bestSession.accuracyPercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    Recorded on {new Date(userSummary.bestSession.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            )}

            {userSummary.worstSession && (
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <svg className="h-5 w-5 text-orange-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-md font-semibold text-orange-800">Lowest Accuracy Session</h4>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 font-medium">
                    {userSummary.worstSession.sessionName}
                  </p>
                  <p className="text-3xl font-bold text-orange-700">
                    {userSummary.worstSession.accuracyPercent.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    Recorded on {new Date(userSummary.worstSession.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
          {userSummary.bestSession && userSummary.worstSession && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <strong>Accuracy Range:</strong> {(userSummary.bestSession.accuracyPercent - userSummary.worstSession.accuracyPercent).toFixed(1)}% variation across sessions
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Firmware Performance for this User */}
      {firmwareData.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Firmware Version Performance</h3>
          <p className="text-sm text-gray-600 mb-4">
            Comparing Falcon's performance across different firmware versions helps track improvements and identify optimal configurations for this user.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firmware Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Kappa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {firmwareData.map((fw) => (
                  <tr key={fw.firmwareVersion} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fw.firmwareVersion}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{fw.totalSessions}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getAccuracyColor(fw.avgAccuracyPercent)}>
                        {fw.avgAccuracyPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getKappaColor(fw.avgKappaScore)}>
                        {fw.avgKappaScore.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {fw.avgAccuracyPercent >= 85 && fw.avgKappaScore >= 0.8 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Excellent
                        </span>
                      )}
                      {fw.avgAccuracyPercent >= 75 && fw.avgAccuracyPercent < 85 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Good
                        </span>
                      )}
                      {fw.avgAccuracyPercent < 75 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Needs Work
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Benchmark Device Performance for this User */}
      {benchmarkData.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Benchmark Device Comparison</h3>
          <p className="text-sm text-gray-600 mb-4">
            Performance metrics when Falcon is compared against different benchmark devices. Variations may indicate device-specific compatibility or user physiology factors.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benchmark Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Kappa</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deep Bias</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">REM Bias</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {benchmarkData.map((bm) => (
                  <tr key={bm.benchmarkDevice} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{bm.benchmarkDevice}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{bm.totalSessions}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getAccuracyColor(bm.avgAccuracyPercent)}>
                        {bm.avgAccuracyPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={getKappaColor(bm.avgKappaScore)}>
                        {bm.avgKappaScore.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-900">{formatTime(Math.abs(bm.avgDeepBiasSec))}</span>
                      <span className="text-xs text-gray-500 ml-1">
                        {bm.avgDeepBiasSec > 0 ? '↑' : '↓'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-900">{formatTime(Math.abs(bm.avgRemBiasSec))}</span>
                      <span className="text-xs text-gray-500 ml-1">
                        {bm.avgRemBiasSec > 0 ? '↑' : '↓'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminSleepUserView;
