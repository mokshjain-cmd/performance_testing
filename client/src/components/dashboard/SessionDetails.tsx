
import React from 'react';
import type { Session } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  session: Session;
}

const badgeStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  borderRadius: 4,
  padding: '2px 6px'
});

const SessionDetails: React.FC<Props> = ({ session }) => {
  return (
    <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
      <h2 style={{ marginBottom: 12 }}>Session Details</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div><strong>ID:</strong> <span style={badgeStyle('#e0e7ff')}>{session._id}</span></div>

        <div>
          <strong>User:</strong>{' '}
          <span style={badgeStyle('#e0e7ff')}>
            {session.userId?.name} ({session.userId?.email})
          </span>
        </div>

        <div><strong>Activity:</strong> <span style={badgeStyle('#fef9c3')}>{session.activityType}</span></div>
        <div>
          <strong>Start:</strong> 
          <span style={badgeStyle('#bbf7d0')}>{splitDateTime(session.startTime).date}</span>
          <span style={badgeStyle('#bbf7d0')}>{splitDateTime(session.startTime).time}</span>
        </div>
        <div>
          <strong>End:</strong> 
          <span style={badgeStyle('#fca5a5')}>{splitDateTime(session.endTime).date}</span>
          <span style={badgeStyle('#fca5a5')}>{splitDateTime(session.endTime).time}</span>
        </div>
        <div><strong>Duration:</strong> <span style={badgeStyle('#f3e8ff')}>{session.durationSec}s</span></div>

        <div>
          <strong>Devices:</strong>{' '}
          {session.devices.map(d => (
            <span key={d.deviceId} style={{ ...badgeStyle('#bae6fd'), marginRight: 6 }}>
              {d.deviceType}
            </span>
          ))}
        </div>

        <div><strong>Benchmark:</strong> <span style={badgeStyle('#fcd34d')}>{session.benchmarkDeviceType}</span></div>
        <div><strong>Band Position:</strong> <span style={badgeStyle('#fef08a')}>{session.bandPosition}</span></div>

        <div>
          <strong>Valid:</strong>{' '}
          <span style={badgeStyle(session.isValid ? '#bbf7d0' : '#fecaca')}>
            {session.isValid ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;
