import React from 'react';
import type { UserSummary } from '../../types';
import SummaryCards from './SummaryCard';
import BarGraph from './BarGraph';
import TableWithBar from './TableWithBar';
import Loader from '../common/Loader';

interface Props {
  userSummary: UserSummary | null;
  loading: boolean;
}

const OverviewTab: React.FC<Props> = ({ userSummary, loading }) => {
  if (loading) return <Loader />;
  if (!userSummary) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-gray-600">No summary data found</p>
      </div>
    </div>
  );

  // Prepare bar graph data
  const activityData = userSummary.activityWiseAccuracy?.map(a => ({ name: a.activityType, accuracy: a.avgAccuracy })) || [];
  const bandData = userSummary.bandPositionWiseAccuracy?.map(b => ({ name: b.bandPosition, accuracy: b.avgAccuracy })) || [];
  const firmwareData = userSummary.firmwareWiseAccuracy?.map(f => ({ name: f.firmwareVersion, accuracy: f.avgAccuracy })) || [];


  return (
    <div className="space-y-6">
      <SummaryCards userSummary={userSummary} />


      {/* Activity Wise Accuracy */}
      {activityData.length > 0 && (
        <TableWithBar
          title="📊 Activity Wise Accuracy"
          data={userSummary.activityWiseAccuracy}
          columns={[
            { key: 'activityType', label: 'Activity' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
            { key: 'totalDurationSec', label: 'Total Duration (s)' },
          ]}
          barData={activityData}
          barColor="#3b82f6"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

      {/* Band Position Wise Accuracy */}
      {bandData.length > 0 && (
        <TableWithBar
          title="📍 Band Position Wise Accuracy"
          data={userSummary.bandPositionWiseAccuracy}
          columns={[
            { key: 'bandPosition', label: 'Band Position' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
            { key: 'totalDurationSec', label: 'Total Duration (s)' },
          ]}
          barData={bandData}
          barColor="#f59e0b"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

      {/* Firmware Wise Accuracy */}
      {firmwareData.length > 0 && (
        <TableWithBar
          title="🔧 Firmware Wise Accuracy"
          data={userSummary.firmwareWiseAccuracy}
          columns={[
            { key: 'firmwareVersion', label: 'Firmware Version' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
          ]}
          barData={firmwareData}
          barColor="#8b5cf6"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

    </div>
  );
};

export default OverviewTab;
