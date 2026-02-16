import React from 'react';
import type { Session } from '../../types';

interface Props {
  sessions: Session[];
  activeTab: 'overview' | 'sessions';
  setActiveTab: (v: 'overview' | 'sessions') => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string) => void;
}

const Sidebar: React.FC<Props> = ({
  sessions,
  activeTab,
  setActiveTab,
  selectedSessionId,
  setSelectedSessionId
}) => {
  return (
    <>
      <button
        onClick={() => {
          setActiveTab('overview');
          setSelectedSessionId(null as any);
        }}
      >
        Overview
      </button>

      <h3>Sessions</h3>

      {sessions.map(s => (
        <button
          key={s._id}
          onClick={() => {
            setActiveTab('sessions');
            setSelectedSessionId(s._id);
          }}
          style={{
            background:
              activeTab === 'sessions' && selectedSessionId === s._id
                ? '#d1eaff'
                : '#fff'
          }}
        >
          {s.name || s._id}
        </button>
      ))}
    </>
  );
};

export default Sidebar;
