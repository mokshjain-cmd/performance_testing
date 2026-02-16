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
  setSelectedSessionId,
}) => {
  const baseButton =
  "w-full text-left px-4 py-3 mb-2 rounded-xl text-base font-medium transition-all duration-200 shadow-sm truncate";

  const inactiveButton =
    "bg-gradient-to-r from-[#f7f8fa] to-[#f1f2f6] text-gray-800 hover:shadow-md border border-transparent hover:border-indigo-20";

  const activeButton =
    "bg-gradient-to-r from-indigo-100 to-blue-100 text-blue-600 shadow-md";

  return (
    <div>
      {/* Overview Button */}
      <button
        className={`${baseButton} ${
          activeTab === 'overview' ? activeButton : inactiveButton
        }`}
        onClick={() => {
          setActiveTab('overview');
          setSelectedSessionId(null as any);
        }}
      >
        Overview
      </button>

      {/* Sessions Header */}
      <div className="mt-6 mb-3 text-lg font-bold tracking-wide text-gray-800">
        Sessions
      </div>

      {/* Session List */}
      <div className="flex flex-col gap-2">
        {sessions.map((s) => (
          <button
            key={s._id}
            className={`${baseButton} ${
              activeTab === 'sessions' && selectedSessionId === s._id
                ? activeButton
                : inactiveButton
            }`}
            onClick={() => {
              setActiveTab('sessions');
              setSelectedSessionId(s._id);
            }}
          >
            {s.name || s._id}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
