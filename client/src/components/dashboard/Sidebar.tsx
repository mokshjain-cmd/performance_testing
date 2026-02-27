import React from 'react';
import { BarChart3, Activity, FileText } from 'lucide-react';
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
    "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3";
  
  const activeButton = 
    "bg-gradient-to-r from-purple-100 to-blue-100 text-blue-600 shadow-md";
  
  const inactiveButton = 
    "text-gray-700 hover:bg-gray-100 border border-transparent";

  return (
    <div className="space-y-4">
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
        <BarChart3 size={18} />
        <span>Overview</span>
      </button>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-4" />

      {/* Sessions Section */}
      <div>
        <div className="flex items-center gap-2 px-4 mb-3">
          <FileText size={16} className="text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Sessions ({sessions.length})
          </h3>
        </div>

        {/* Session List */}
        <div className="space-y-1 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Activity size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No sessions found</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isSessionSelected = activeTab === 'sessions' && selectedSessionId === s._id;
              
              return (
                <button
                  key={s._id}
                  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 w-full ${
                    isSessionSelected 
                      ? 'bg-green-100 text-green-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setActiveTab('sessions');
                    setSelectedSessionId(s._id);
                  }}
                >
                  <Activity size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{s.name || `Session ${s._id.slice(-8)}`}</span>
                      {s.metric && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium flex-shrink-0">
                          {s.metric}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
