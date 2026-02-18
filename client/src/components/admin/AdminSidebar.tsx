import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Users as UsersIcon, Activity, User, BarChart3, Trash2 } from 'lucide-react';

interface Session {
  _id: string;
  name?: string;
  activityType?: string;
  startTime?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  sessions: Session[];
}

interface AdminSidebarProps {
  users: User[];
  activeView: 'overview' | 'user' | 'session';
  selectedUserId: string | null;
  selectedSessionId: string | null;
  onSelectOverview: () => void;
  onSelectUser: (userId: string) => void;
  onSelectSession: (sessionId: string, userId: string) => void;
  onUserExpand?: (userId: string) => void;
  onDeleteSession?: (sessionId: string, userId: string) => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  users,
  activeView,
  selectedUserId,
  selectedSessionId,
  onSelectOverview,
  onSelectUser,
  onSelectSession,
  onUserExpand,
  onDeleteSession,
}) => {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
        // Fetch sessions when expanding
        if (onUserExpand) {
          onUserExpand(userId);
        }
      }
      return newSet;
    });
  };

  const baseButton = "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3";
  const activeButton = "bg-gradient-to-r from-purple-100 to-blue-100 text-blue-600 shadow-md";
  const inactiveButton = "text-gray-700 hover:bg-gray-100 border border-transparent";

  return (
    <div className="space-y-4">
      {/* Overview Button */}
      <button
        className={`${baseButton} ${activeView === 'overview' ? activeButton : inactiveButton}`}
        onClick={onSelectOverview}
      >
        <BarChart3 size={18} />
        <span>Global Overview</span>
      </button>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-4" />

      {/* Users Section */}
      <div>
        <div className="flex items-center gap-2 px-4 mb-3">
          <UsersIcon size={16} className="text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Users ({users.length})
          </h3>
        </div>

        <div className="space-y-1">
          {users.map((user) => {
            const isExpanded = expandedUsers.has(user._id);
            const isUserSelected = activeView === 'user' && selectedUserId === user._id;
            
            return (
              <div key={user._id}>
                {/* User Row */}
                <div className="flex items-center gap-1">
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => toggleUserExpansion(user._id)}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  <button
                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
                      isUserSelected ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      onSelectUser(user._id);
                      if (!isExpanded) toggleUserExpansion(user._id);
                    }}
                  >
                    <User size={16} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>
                  </button>
                </div>

                {/* Sessions List (when expanded) */}
                {isExpanded && user.sessions.length > 0 && (
                  <div className="ml-10 mt-1 space-y-1">
                    {user.sessions.map((session) => {
                      const isSessionSelected = activeView === 'session' && selectedSessionId === session._id;
                      
                      return (
                        <div key={session._id} className="flex items-center gap-1 group">
                          <button
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 flex items-center gap-2 ${
                              isSessionSelected 
                                ? 'bg-green-100 text-green-700 font-medium' 
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                            onClick={() => onSelectSession(session._id, user._id)}
                          >
                            <Activity size={14} />
                            <div className="flex-1 min-w-0">
                              <div className="truncate">Session {session._id.slice(-8)}</div>
                              {session.activityType && (
                                <div className="text-xs text-gray-500 capitalize">{session.activityType}</div>
                              )}
                            </div>
                          </button>
                          {onDeleteSession && (
                            <button
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded-lg transition-all duration-200 text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session._id, user._id);
                              }}
                              title="Delete session"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isExpanded && user.sessions.length === 0 && (
                  <div className="ml-10 mt-1 px-3 py-2 text-xs text-gray-400 italic">
                    No sessions
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <UsersIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;
