import React from 'react';

import type { UserSummary } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  userSummary: UserSummary;
}

const cardStyle: React.CSSProperties = {
  background: '#f9fafb',
  borderRadius: 8,
  padding: 16,
  boxShadow: '0 1px 4px #eee'
};


const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 8,
};
const thtd: React.CSSProperties = {
  padding: 8,
  border: '1px solid #eee',
  textAlign: 'center',
};

const SummaryCards: React.FC<Props> = ({ userSummary }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Basic Info */}
      <div style={cardStyle}>
        <div style={{ fontSize: 22, fontWeight: 600 }}>{userSummary.userId.name}</div>
        <div style={{ color: '#666', marginBottom: 8 }}>{userSummary.userId.email}</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div><strong>Total Sessions:</strong> <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px' }}>{userSummary.totalSessions}</span></div>
          <div>
            <strong>Last Updated:</strong> 
            <span style={{ background: '#fef9c3', borderRadius: 4, padding: '2px 6px', marginRight: 4 }}>
              {splitDateTime(userSummary.lastUpdated).date}
            </span>
            <span style={{ background: '#fef9c3', borderRadius: 4, padding: '2px 6px' }}>
              {splitDateTime(userSummary.lastUpdated).time}
            </span>
          </div>
        </div>
      </div>

      {/* Overall Accuracy */}
      {userSummary.overallAccuracy && (
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 8 }}>Overall Accuracy</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><strong>Avg MAE:</strong> <span style={{ background: '#bae6fd', borderRadius: 4, padding: '2px 6px' }}>{userSummary.overallAccuracy.avgMAE?.toFixed(2)}</span></div>
            <div><strong>Avg RMSE:</strong> <span style={{ background: '#fcd34d', borderRadius: 4, padding: '2px 6px' }}>{userSummary.overallAccuracy.avgRMSE?.toFixed(2)}</span></div>
            <div><strong>Avg Pearson:</strong> <span style={{ background: '#bbf7d0', borderRadius: 4, padding: '2px 6px' }}>{userSummary.overallAccuracy.avgPearson?.toFixed(3)}</span></div>
            <div><strong>Avg MAPE:</strong> <span style={{ background: '#fca5a5', borderRadius: 4, padding: '2px 6px' }}>{userSummary.overallAccuracy.avgMAPE?.toFixed(2)}</span></div>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default SummaryCards;
