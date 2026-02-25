import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import BarGraph from '../dashboard/BarGraph';
import type { Metric } from './MetricsSelector';
import axios from 'axios';

interface UserSummary {
  totalSessions: number;
  overallAccuracy?: {
    avgMAE?: number;
    avgRMSE?: number;
    avgPearson?: number;
    avgMAPE?: number;
  };
  activityWiseAccuracy: Array<{
    activityType: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
  }>;
  firmwareWiseAccuracy: Array<{
    firmwareVersion: string;
    avgAccuracy: number;
    totalSessions: number;
  }>;
  bandPositionWiseAccuracy: Array<{
    bandPosition: string;
    avgAccuracy: number;
    totalSessions: number;
    totalDurationSec: number;
  }>;
  bestSession?: {
    sessionId: string;
    activityType: string;
    accuracyPercent: number;
  };
  worstSession?: {
    sessionId: string;
    activityType: string;
    accuracyPercent: number;
  };
  lastUpdated: Date;
}

interface AdminUserViewProps {
  userId: string;
  metric: Metric;
}

const AdminUserView: React.FC<AdminUserViewProps> = ({ userId, metric: _metric }) => {
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch user summary data
    // API: GET /api/users/summary/{userId}
    setLoading(true);
    axios.get(`http://localhost:3000/api/users/summary/${userId}`)
      .then(res => {
        console.log('Fetched user summary:', res.data);
        setUserSummary(res.data.summary);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!userSummary) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          <p>No data available for this user</p>
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
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent">
              {userSummary.totalSessions}
            </p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg MAPE</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">
              {userSummary.overallAccuracy?.avgMAPE ? `${userSummary.overallAccuracy.avgMAPE.toFixed(2)}%` : '--'}
            </p>
            <p className="text-xs text-gray-500">% Error | Lower is better | Target: &lt;10%</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg MAE</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-purple-600 bg-clip-text text-transparent">
              {userSummary.overallAccuracy?.avgMAE ? `${userSummary.overallAccuracy.avgMAE.toFixed(2)} BPM` : '--'}
            </p>
            <p className="text-xs text-gray-500">Mean Absolute Error | Lower is better | Target: &lt;5 BPM</p>
          </div>
        </Card>

        <Card>
          <div className="space-y-2">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Avg Pearson R</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
              {userSummary.overallAccuracy?.avgPearson ? userSummary.overallAccuracy.avgPearson.toFixed(3) : '--'}
            </p>
            <p className="text-xs text-gray-500">Correlation | Higher is better | Target: &gt;0.9</p>
          </div>
        </Card>
      </div>

      {/* Best & Worst Sessions */}
      <Card title="Best & Worst Sessions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userSummary.bestSession && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600 font-medium mb-2">Best Session</div>
              <div className="text-xs text-gray-600 mb-1">Activity: {userSummary.bestSession.activityType}</div>
              <div className="text-2xl font-bold text-green-700">
                {userSummary.bestSession.accuracyPercent?.toFixed(1)}%
              </div>
            </div>
          )}
          
          {userSummary.worstSession && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600 font-medium mb-2">Worst Session</div>
              <div className="text-xs text-gray-600 mb-1">Activity: {userSummary.worstSession.activityType}</div>
              <div className="text-2xl font-bold text-red-700">
                {userSummary.worstSession.accuracyPercent?.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Activity-wise Accuracy Bar Graph */}
      {userSummary.activityWiseAccuracy && userSummary.activityWiseAccuracy.length > 0 && (
        <Card title="Activity-wise Accuracy">
          <BarGraph
            data={userSummary.activityWiseAccuracy.map(a => ({
              name: a.activityType,
              accuracy: a.avgAccuracy
            }))}
            title=""
            color="#3b82f6"
            yLabel="Accuracy %"
          />
          <div className="mt-4 space-y-2">
            {userSummary.activityWiseAccuracy.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800 capitalize">{activity.activityType}</div>
                  <div className="text-sm text-gray-500">
                    {activity.totalSessions} sessions · {(activity.totalDurationSec / 60).toFixed(0)} min total
                  </div>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {activity.avgAccuracy?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Firmware-wise Accuracy Bar Graph */}
      {userSummary.firmwareWiseAccuracy && userSummary.firmwareWiseAccuracy.length > 0 && (
        <Card title="Firmware-wise Accuracy">
          <BarGraph
            data={userSummary.firmwareWiseAccuracy.map(f => ({
              name: f.firmwareVersion,
              accuracy: f.avgAccuracy
            }))}
            title=""
            color="#10b981"
            yLabel="Accuracy %"
          />
          <div className="mt-4 space-y-2">
            {userSummary.firmwareWiseAccuracy.map((firmware, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800">v{firmware.firmwareVersion}</div>
                  <div className="text-sm text-gray-500">{firmware.totalSessions} sessions</div>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {firmware.avgAccuracy?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Band Position-wise Accuracy Bar Graph */}
      {userSummary.bandPositionWiseAccuracy && userSummary.bandPositionWiseAccuracy.length > 0 && (
        <Card title="Band Position-wise Accuracy">
          <BarGraph
            data={userSummary.bandPositionWiseAccuracy.map(b => ({
              name: b.bandPosition,
              accuracy: b.avgAccuracy
            }))}
            title=""
            color="#f59e0b"
            yLabel="Accuracy %"
          />
          <div className="mt-4 space-y-2">
            {userSummary.bandPositionWiseAccuracy.map((band, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-800 capitalize">{band.bandPosition}</div>
                  <div className="text-sm text-gray-500">
                    {band.totalSessions} sessions · {(band.totalDurationSec / 60).toFixed(0)} min total
                  </div>
                </div>
                <div className="text-xl font-bold text-amber-600">
                  {band.avgAccuracy?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminUserView;
