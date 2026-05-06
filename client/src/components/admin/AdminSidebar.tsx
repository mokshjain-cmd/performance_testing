import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users as UsersIcon, Activity, User, BarChart3, Trash2, Target, Snowflake, Swords, PersonStanding, Music, Dribbble, Dumbbell, Timer, Waves, Bike, Mountain, Footprints } from 'lucide-react';
import type { Metric } from './MetricsSelector';
const SPORT_TYPES: Record<number, { name: string; icon: typeof Activity; color: string }> = {
  // Running
  1: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' },
  3: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' },
  66: { name: 'Treadmill', icon: Activity, color: 'text-orange-400' },
  139: { name: 'Marathon', icon: Activity, color: 'text-orange-600' },
  206: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' },
  207: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' },
  220: { name: 'Running', icon: Activity, color: 'text-orange-500' },
  246: { name: 'Outdoor Running', icon: Activity, color: 'text-orange-500' }, // Bracelet
  247: { name: 'Indoor Running', icon: Activity, color: 'text-orange-400' }, // Bracelet
  
  // Walking
  2: { name: 'Outdoor Walking', icon: Footprints, color: 'text-green-500' },
  135: { name: 'Indoor Walking', icon: Footprints, color: 'text-green-400' },
  208: { name: 'Walking', icon: Footprints, color: 'text-green-500' },
  251: { name: 'Outdoor Walking', icon: Footprints, color: 'text-green-500' }, // Bracelet
  
  // Hiking/Trekking
  4: { name: 'Trekking', icon: Mountain, color: 'text-emerald-600' },
  5: { name: 'Trail Running', icon: Mountain, color: 'text-emerald-500' },
  13: { name: 'Outdoor Hiking', icon: Mountain, color: 'text-emerald-600' },
  229: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' },
  249: { name: 'Hiking', icon: Mountain, color: 'text-emerald-600' }, // Bracelet
  252: { name: 'Trail Running', icon: Mountain, color: 'text-emerald-500' }, // Bracelet
  
  // Cycling
  6: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' },
  7: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' },
  14: { name: 'BMX', icon: Bike, color: 'text-blue-600' },
  124: { name: 'Mountain Cycling', icon: Bike, color: 'text-blue-600' },
  209: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' },
  210: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' },
  221: { name: 'Cycling', icon: Bike, color: 'text-blue-500' },
  244: { name: 'Outdoor Cycling', icon: Bike, color: 'text-blue-500' }, // Bracelet
  245: { name: 'Indoor Cycling', icon: Bike, color: 'text-blue-400' }, // Bracelet
  253: { name: 'Spinning Bike', icon: Bike, color: 'text-blue-400' }, // Bracelet
  
  // Swimming
  21: { name: 'Pool Swimming', icon: Waves, color: 'text-cyan-500' },
  22: { name: 'Open Water', icon: Waves, color: 'text-cyan-600' },
  200: { name: 'Pool Swimming', icon: Waves, color: 'text-cyan-500' },
  219: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' },
  248: { name: 'Swimming', icon: Waves, color: 'text-cyan-500' }, // Bracelet
  
  // Gym/Fitness
  8: { name: 'Freestyle', icon: Dumbbell, color: 'text-purple-500' },
  23: { name: 'Core Training', icon: Dumbbell, color: 'text-purple-500' },
  25: { name: 'Strength Training', icon: Dumbbell, color: 'text-purple-600' },
  30: { name: 'Indoor Fitness', icon: Dumbbell, color: 'text-purple-500' },
  34: { name: 'Elliptical', icon: Dumbbell, color: 'text-purple-400' },
  64: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  84: { name: 'CrossFit', icon: Dumbbell, color: 'text-purple-600' },
  121: { name: 'Rowing Machine', icon: Dumbbell, color: 'text-purple-500' },
  122: { name: 'Rope Skipping', icon: Timer, color: 'text-red-400' },
  223: { name: 'HIIT', icon: Timer, color: 'text-red-500' },
  228: { name: 'Strength Training', icon: Dumbbell, color: 'text-purple-600' },
  
  // Yoga/Pilates
  28: { name: 'Pilates', icon: PersonStanding, color: 'text-pink-500' },
  35: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  215: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  266: { name: 'Yoga', icon: PersonStanding, color: 'text-pink-500' },
  233: { name: 'Pilates', icon: PersonStanding, color: 'text-pink-500' },
  
  // Ball Sports
  9: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  10: { name: 'Football', icon: Dribbble, color: 'text-green-600' },
  11: { name: 'Pingpong', icon: Target, color: 'text-yellow-500' },
  12: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  39: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  105: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  134: { name: 'Golf', icon: Target, color: 'text-green-700' },
  155: { name: 'Pickleball', icon: Target, color: 'text-lime-600' },
  211: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  212: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  213: { name: 'Soccer', icon: Dribbble, color: 'text-green-600' },
  214: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  230: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  256: { name: 'Golf', icon: Target, color: 'text-green-700' },
  257: { name: 'Soccer', icon: Dribbble, color: 'text-green-600' },
  258: { name: 'Badminton', icon: Target, color: 'text-lime-500' },
  259: { name: 'Tennis', icon: Target, color: 'text-yellow-600' },
  262: { name: 'Cricket', icon: Dribbble, color: 'text-green-500' },
  265: { name: 'Basketball', icon: Dribbble, color: 'text-orange-600' },
  
  // Dancing
  47: { name: 'Ballet', icon: Music, color: 'text-pink-400' },
  52: { name: 'Dance', icon: Music, color: 'text-pink-500' },
  53: { name: 'Zumba', icon: Music, color: 'text-pink-600' },
  226: { name: 'Dance', icon: Music, color: 'text-pink-500' },
  227: { name: 'Zumba', icon: Music, color: 'text-pink-600' },
  
  // Martial Arts
  56: { name: 'Boxing', icon: Swords, color: 'text-red-600' },
  59: { name: 'Tai Chi', icon: PersonStanding, color: 'text-indigo-500' },
  61: { name: 'Taekwondo', icon: Swords, color: 'text-red-500' },
  62: { name: 'Martial Arts', icon: Swords, color: 'text-red-500' },
  125: { name: 'Kickboxing', icon: Swords, color: 'text-red-600' },
  
  // Winter Sports
  126: { name: 'Skiing', icon: Snowflake, color: 'text-sky-500' },
  128: { name: 'Snowboarding', icon: Snowflake, color: 'text-sky-600' },
  
  // Triathlon
  123: { name: 'Triathlon', icon: Activity, color: 'text-amber-500' },
  204: { name: 'Triathlon', icon: Activity, color: 'text-amber-500' },
  
  // Generic workout
  0: { name: 'Workout', icon: Target, color: 'text-gray-500' },
};
interface Session {
  sportType?: number;
  _id: string;
  name?: string;
  activityType?: string;
  startTime?: string;
  metric?: string;
  firmwareVersion?: string;
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
  selectedMetric: Metric;
  onSelectOverview: () => void;
  onSelectUser: (userId: string) => void;
  onSelectSession: (sessionId: string, userId: string) => void;
  onUserExpand?: (userId: string) => void;
  onDeleteSession?: (sessionId: string, userId: string) => void;
}
const getSportInfo = (sportType: number) => {
  console.log('Getting sport info for type:', sportType);
  return SPORT_TYPES[sportType] || SPORT_TYPES[0];
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  users,
  activeView,
  selectedUserId,
  selectedSessionId,
  selectedMetric,
  onSelectOverview,
  onSelectUser,
  onSelectSession,
  onUserExpand,
  onDeleteSession,
}) => {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Refetch sessions for all expanded users when metric changes
  useEffect(() => {
    if (expandedUsers.size > 0 && onUserExpand) {
      expandedUsers.forEach(userId => {
        onUserExpand(userId);
      });
    }
  }, [selectedMetric]);

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
                              <div className="flex items-center gap-2">
                                <span className="truncate">{session.name || `Session ${session._id.slice(-8)}`}</span>
                                {session.firmwareVersion && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex-shrink-0">
                                    v{session.firmwareVersion}
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-500 capitalize">
                                  {selectedMetric === 'workout'
                                    ? (session.sportType !== undefined && SPORT_TYPES[session.sportType]
                                        ? getSportInfo(session.sportType).name
                                        : 'Daily')
                                    : session.activityType}
                                </div>
                              
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
                    No {selectedMetric.toUpperCase()} sessions
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
