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
        <p className="text-gray-600">No summary data found</p>
      </div>
    </div>
  );

  // Prepare bar graph data with null checks
  const activityData = userSummary.activityWiseAccuracy?.map(a => ({ 
    name: a.activityType || 'Unknown', 
    accuracy: a.avgAccuracy ?? 0 
  })) || [];
  const bandData = userSummary.bandPositionWiseAccuracy?.map(b => ({ 
    name: b.bandPosition || 'Unknown', 
    accuracy: b.avgAccuracy ?? 0 
  })) || [];
  const firmwareData = userSummary.firmwareWiseAccuracy?.map(f => ({ 
    name: f.firmwareVersion || 'Unknown', 
    accuracy: f.avgAccuracy ?? 0 
  })) || [];


  return (
    <div className="space-y-6">
      <SummaryCards userSummary={userSummary} />


      {/* Activity Wise Accuracy */}
      {activityData.length > 0 && (
        <TableWithBar
          title="Activity Wise Accuracy"
          data={userSummary.activityWiseAccuracy || []}
          columns={[
            { key: 'activityType', label: 'Activity', render: v => v || 'Unknown' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => (v != null ? v.toFixed(2) : '--') },
            { key: 'totalSessions', label: 'Sessions', render: v => v ?? 0 },
            { key: 'totalDurationSec', label: 'Total Duration (s)', render: v => v ?? 0 },
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
          title="Band Position Wise Accuracy"
          data={userSummary.bandPositionWiseAccuracy || []}
          columns={[
            { key: 'bandPosition', label: 'Band Position', render: v => v || 'Unknown' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => (v != null ? v.toFixed(2) : '--') },
            { key: 'totalSessions', label: 'Sessions', render: v => v ?? 0 },
            { key: 'totalDurationSec', label: 'Total Duration (s)', render: v => v ?? 0 },
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
          title="Firmware Wise Accuracy"
          data={userSummary.firmwareWiseAccuracy || []}
          columns={[
            { key: 'firmwareVersion', label: 'Firmware Version', render: v => v || 'Unknown' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => (v != null ? v.toFixed(2) : '--') },
            { key: 'totalSessions', label: 'Sessions', render: v => v ?? 0 },
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
