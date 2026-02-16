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
  if (!userSummary) return <div>No summary data found.</div>;

  // Prepare bar graph data
  const activityData = userSummary.activityWiseAccuracy?.map(a => ({ name: a.activityType, accuracy: a.avgAccuracy })) || [];
  const bandData = userSummary.bandPositionWiseAccuracy?.map(b => ({ name: b.bandPosition, accuracy: b.avgAccuracy })) || [];
  const firmwareData = userSummary.firmwareWiseAccuracy?.map(f => ({ name: f.firmwareVersion, accuracy: f.avgAccuracy })) || [];


  return (
    <div>
      <h2>User Overview</h2>
      <SummaryCards userSummary={userSummary} />


      {/* Activity Wise Accuracy */}
      {activityData.length > 0 && (
        <TableWithBar
          title="Activity Wise Accuracy"
          data={userSummary.activityWiseAccuracy}
          columns={[
            { key: 'activityType', label: 'Activity' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
            { key: 'totalDurationSec', label: 'Total Duration (s)' },
          ]}
          barData={activityData}
          barColor="#38bdf8"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

      {/* Band Position Wise Accuracy */}
      {bandData.length > 0 && (
        <TableWithBar
          title="Band Position Wise Accuracy"
          data={userSummary.bandPositionWiseAccuracy}
          columns={[
            { key: 'bandPosition', label: 'Band Position' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
            { key: 'totalDurationSec', label: 'Total Duration (s)' },
          ]}
          barData={bandData}
          barColor="#f59e42"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

      {/* Firmware Wise Accuracy */}
      {firmwareData.length > 0 && (
        <TableWithBar
          title="Firmware Wise Accuracy"
          data={userSummary.firmwareWiseAccuracy}
          columns={[
            { key: 'firmwareVersion', label: 'Firmware Version' },
            { key: 'avgAccuracy', label: 'Avg Accuracy %', render: v => v.toFixed(2) },
            { key: 'totalSessions', label: 'Sessions' },
          ]}
          barData={firmwareData}
          barColor="#a78bfa"
          yLabel="Accuracy %"
          BarGraph={BarGraph}
        />
      )}

    </div>
  );
};

export default OverviewTab;
