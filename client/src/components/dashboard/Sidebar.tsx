import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Session } from '../../types';

interface Props {
  sessions: Session[];
  activeTab: 'overview' | 'sessions';
  setActiveTab: (v: 'overview' | 'sessions') => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

const Sidebar: React.FC<Props> = ({
  sessions,
  activeTab,
  setActiveTab,
  selectedSessionId,
  setSelectedSessionId,
  onDeleteSession,
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
          <div key={s._id} className="relative group">
            <button
              className={`${baseButton} ${
                activeTab === 'sessions' && selectedSessionId === s._id
                  ? activeButton
                  : inactiveButton
              } pr-12`}
              onClick={() => {
                setActiveTab('sessions');
                setSelectedSessionId(s._id);
              }}
            >
              {s.name || s._id}
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(s._id);
              }}
              title="Delete session"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
