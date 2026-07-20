import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users as UsersIcon, Activity, User, BarChart3, Trash2, Target, Snowflake, Swords, PersonStanding, Music, Dribbble, Dumbbell, Timer, Waves, Bike, Mountain, Footprints, Calendar } from 'lucide-react';
import type { Metric } from './MetricsSelector';
import apiClient from '../../services/api';
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

  deviceType?: string;
  firmwareVersion?: string;
  bandPosition?: string;

  _id: string;
  name?: string;
  activityType?: string;
  startTime?: string;
  metric?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  sessions: Session[];
}
interface SidebarFilters {
  deviceType: string[];
  firmwareVersion: string[];
  sportTypes: number[];
  bandPosition: string[];
  date: string | null;
}
interface AdminSidebarProps {
  users: User[];
  activeView: 'overview' | 'user' | 'session';
  selectedUserId: string | null;
  selectedSessionId: string | null;
  selectedMetric: Metric;
  filters: SidebarFilters;
  onFiltersChange: (filters: SidebarFilters) => void;
  onSelectOverview: () => void;
  onSelectUser: (userId: string) => void;
  onSelectSession: (sessionId: string, userId: string) => void;
  onUserExpand?: (userId: string) => void;
  onDeleteSession?: (sessionId: string, userId: string) => void;
}
const BAND_POSITION_OPTIONS = [
  { value: 'wrist', label: 'Wrist' },
  { value: 'bicep', label: 'Bicep' },
  { value: 'leg', label: 'Leg' },
  { value: 'dominant-wrist', label: 'Dominant Wrist' },
  { value: 'non-dominant-wrist', label: 'Non-Dominant Wrist' },
  { value: 'dominant-bicep', label: 'Dominant Bicep' },
  { value: 'non-dominant-bicep', label: 'Non-Dominant Bicep' },
];

const SPORT_GROUPS: Record<string, number[]> = {

  // Running
  outdoor_running: [1, 207, 220, 246],
  indoor_running: [3, 66, 206, 247],
  marathon: [139],
  trail_running: [5, 252],

  // Walking / Hiking
  outdoor_walking: [2, 208, 251],
  indoor_walking: [135],
  hiking: [13, 229, 249],
  trekking: [4],

  // Cycling
  outdoor_cycling: [6, 210, 221, 244],
  indoor_cycling: [7, 209, 245],
  mountain_cycling: [124],
  spinning: [253],
  bmx: [14],

  // Swimming
  swimming: [21, 22, 200, 219, 248],

  // Strength / Workout
  strength_training: [25, 35, 215, 266, 228], // yoga merged
  workout: [0, 8, 30],
  hiit: [64, 223],
  crossfit: [84],
  elliptical: [34],
  rowing: [121],
  rope_skipping: [122],

  // Pilates
  pilates: [28, 233],

  // Sports
  badminton: [12, 211, 258],
  football: [10, 213, 257],
  basketball: [9, 230, 265],
  tennis: [105, 212, 259],
  cricket: [39, 214, 262],
  golf: [134, 256],
  pickleball: [155],
  pingpong: [11],

  // Dance
  dance: [52, 226],
  zumba: [53, 227],
  ballet: [47],

  // Martial Arts
  boxing: [56],
  taekwondo: [61],
  kickboxing: [125],
  martial_arts: [62],
  tai_chi: [59],

  // Winter
  skiing: [126],
  snowboarding: [128],

  // Triathlon
  triathlon: [123, 204],
};
const getSportInfo = (sportType: number) => {
  const sport = SPORT_TYPES[sportType] || SPORT_TYPES[0];

  return sport.name.toLowerCase() === "yoga"
    ? { ...sport, name: "Strength Training" }
    : sport;
};

// Local calendar date (not UTC) so it lines up with what the <input type="date"> picker shows.
const toLocalDateString = (dateStr: string): string => {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  users,
  activeView,
  selectedUserId,
  selectedSessionId,
  selectedMetric,
  filters,
  onFiltersChange,
  onSelectOverview,
  onSelectUser,
  onSelectSession,
  onUserExpand,
  onDeleteSession,
}) => {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [firmwareVersions, setFirmwareVersions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  // Refetch sessions for all expanded users when metric changes
useEffect(() => {
  if (!onUserExpand) return;

  expandedUsers.forEach(userId => {
    onUserExpand(userId);
  });
}, [selectedMetric]);
  useEffect(() => {
  apiClient
    .get('/devices/firmware?deviceType=luna')
    .then((res) => {
      if (res.data.success && res.data.data) {
        const versions = res.data.data.map((version: string) => ({
          value: version,
          label: version,
        }));

        setFirmwareVersions(versions);
      }
    })
    .catch((err) =>
      console.error('Error fetching firmware versions:', err)
    );
}, []);
  // Auto-expand all users when any filter is active
// Auto expand/collapse users based on filters
useEffect(() => {
  const hasActiveFilters =
    filters.firmwareVersion.length > 0 ||
    filters.sportTypes.length > 0 ||
    filters.bandPosition.length > 0 ||
    !!filters.date;

  // COLLAPSE ALL when filters are cleared
  if (!hasActiveFilters) {
    setExpandedUsers(new Set());
    return;
  }

  // EXPAND ALL when filters are active
  const allUserIds = new Set(users.map(user => user._id));

  setExpandedUsers(allUserIds);

  // Fetch sessions if needed
  if (onUserExpand) {
    users.forEach(user => {
      if (!user.sessions || user.sessions.length === 0) {
        onUserExpand(user._id);
      }
    });
  }
}, [filters]);
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
      {/* Divider */}
<div className="h-px bg-gray-200 my-4" />

{/* Filters */}
{/* Filters */}
<div className="relative overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-white to-gray-50 shadow-lg backdrop-blur-xl mb-5">

  {/* Background Glow */}
  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200/20 rounded-full blur-3xl" />
  <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/20 rounded-full blur-2xl" />

  <div className="relative z-10">

    {/* Header */}
    <button
      onClick={() => setFiltersExpanded(!filtersExpanded)}
      className="
        w-full flex items-center justify-between
        px-5 py-4 text-left
        hover:bg-white/40 transition-all duration-200
      "
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md">
          <Target size={16} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-800">
            Smart Filters
          </h3>

          <p className="text-xs text-gray-500">
            Filter sessions & activities
          </p>
        </div>
      </div>

      <div
        className={`
          transition-transform duration-300
          ${filtersExpanded ? 'rotate-180' : ''}
        `}
      >
        <ChevronDown size={18} className="text-gray-500" />
      </div>
    </button>

    {/* Expandable Content */}
    <div
      className={`
        transition-all duration-300 ease-in-out overflow-hidden
        ${filtersExpanded ? 'max-h-[840px] opacity-100' : 'max-h-0 opacity-0'}
      `}
    >
      <div className="px-5 pb-5 space-y-4">

        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Date
          </label>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none"
            />

            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  date: e.target.value || null,
                })
              }
              className="
                w-full rounded-xl border border-gray-200
                bg-white/80 pl-10 pr-3 py-3 text-sm
                shadow-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-purple-400
                focus:border-transparent hover:border-purple-300
              "
            />
          </div>
        </div>

        {/* Sport Type */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Sport Type
          </label>

          <div className="relative">
            <Activity
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500"
            />

            <select
  className="
    w-full appearance-none rounded-xl border border-gray-200
    bg-white/80 pl-10 pr-4 py-3 text-sm
    shadow-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-purple-400
    focus:border-transparent hover:border-purple-300
  "
  onChange={(e) => {
    const value = e.target.value;

    if (!value) {
      onFiltersChange({
        ...filters,
        sportTypes: [],
      });
      return;
    }

    onFiltersChange({
      ...filters,
      sportTypes: SPORT_GROUPS[value] || [],
    });
  }}
>
  <option value="">All Sports</option>

  {/* Running */}
  <optgroup label="Running">
    <option value="outdoor_running">Outdoor Running</option>
    <option value="indoor_running">Indoor Running</option>
    <option value="marathon">Marathon</option>
    <option value="trail_running">Trail Running</option>
  </optgroup>

  {/* Walking / Hiking */}
  <optgroup label="Walking & Hiking">
    <option value="outdoor_walking">Outdoor Walking</option>
    <option value="indoor_walking">Indoor Walking</option>
    <option value="hiking">Hiking</option>
    <option value="trekking">Trekking</option>
  </optgroup>

  {/* Cycling */}
  <optgroup label="Cycling">
    <option value="outdoor_cycling">Outdoor Cycling</option>
    <option value="indoor_cycling">Indoor Cycling</option>
    <option value="mountain_cycling">Mountain Cycling</option>
    <option value="spinning">Spinning Bike</option>
    <option value="bmx">BMX</option>
  </optgroup>

  {/* Fitness */}
  <optgroup label="Fitness">
    <option value="strength_training">Strength Training</option>
    <option value="workout">Workout</option>
    <option value="hiit">HIIT</option>
    <option value="crossfit">CrossFit</option>
    <option value="elliptical">Elliptical</option>
    <option value="rowing">Rowing Machine</option>
    <option value="rope_skipping">Rope Skipping</option>
    <option value="pilates">Pilates</option>
  </optgroup>

  {/* Swimming */}
  <optgroup label="Swimming">
    <option value="swimming">Swimming</option>
  </optgroup>

  {/* Sports */}
  <optgroup label="Sports">
    <option value="badminton">Badminton</option>
    <option value="football">Football</option>
    <option value="basketball">Basketball</option>
    <option value="tennis">Tennis</option>
    <option value="cricket">Cricket</option>
    <option value="golf">Golf</option>
    <option value="pickleball">Pickleball</option>
    <option value="pingpong">Ping Pong</option>
  </optgroup>

  {/* Dance */}
  <optgroup label="Dance">
    <option value="dance">Dance</option>
    <option value="zumba">Zumba</option>
    <option value="ballet">Ballet</option>
  </optgroup>

  {/* Martial Arts */}
  <optgroup label="Martial Arts">
    <option value="boxing">Boxing</option>
    <option value="kickboxing">Kickboxing</option>
    <option value="taekwondo">Taekwondo</option>
    <option value="martial_arts">Martial Arts</option>
    <option value="tai_chi">Tai Chi</option>
  </optgroup>

  {/* Winter */}
  <optgroup label="Winter Sports">
    <option value="skiing">Skiing</option>
    <option value="snowboarding">Snowboarding</option>
  </optgroup>

  {/* Triathlon */}
  <optgroup label="Other">
    <option value="triathlon">Triathlon</option>
  </optgroup>
</select>
          </div>
        </div>

        {/* Firmware */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Firmware Version
          </label>

          <div className="relative">
            <BarChart3
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-500"
            />

            <select
              className="
                w-full appearance-none rounded-xl border border-gray-200
                bg-white/80 pl-10 pr-4 py-3 text-sm
                shadow-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-purple-400
                focus:border-transparent hover:border-purple-300
              "
              value={filters.firmwareVersion[0] || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  firmwareVersion: e.target.value
                    ? [e.target.value]
                    : [],
                });
              }}
            >
              <option value="">All Firmware Versions</option>

              {firmwareVersions.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Band Position */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Band Position
          </label>

          <div className="relative">
            <PersonStanding
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-500"
            />

            <select
              className="
                w-full appearance-none rounded-xl border border-gray-200
                bg-white/80 pl-10 pr-4 py-3 text-sm
                shadow-sm transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-purple-400
                focus:border-transparent hover:border-purple-300
              "
              value={filters.bandPosition[0] || ''}
              onChange={(e) => {
                onFiltersChange({
                  ...filters,
                  bandPosition: e.target.value
                    ? [e.target.value]
                    : [],
                });
              }}
            >
              <option value="">All Band Positions</option>

              {BAND_POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        {(filters.sportTypes.length > 0 ||
          filters.firmwareVersion.length > 0 ||
          filters.bandPosition.length > 0 ||
          !!filters.date) && (
          <div className="flex items-center justify-between pt-2">

            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-1 text-xs font-medium text-purple-700">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />

              {[
                filters.sportTypes.length > 0,
                filters.firmwareVersion.length > 0,
                filters.bandPosition.length > 0,
                !!filters.date,
              ].filter(Boolean).length}{' '}
              active filter(s)
            </div>

            <button
              onClick={() =>
                onFiltersChange({
                  sportTypes: [],
                  firmwareVersion: [],
                  bandPosition: [],
                  deviceType: [],
                  date: null,
                })
              }
              className="
                text-xs font-medium text-red-500
                hover:text-red-600 transition-colors
              "
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
</div>

{/* Users Section */}

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

  const filteredSessions = user.sessions.filter((session) => {


    const firmwareMatch =
      filters.firmwareVersion.length === 0 ||
      filters.firmwareVersion.includes(
        session.firmwareVersion || ''
      );

    const sportMatch =
      filters.sportTypes.length === 0 ||
      filters.sportTypes.includes(
        session.sportType || -1
      );

    const bandMatch =
      filters.bandPosition.length === 0 ||
      filters.bandPosition.includes(
        session.bandPosition || ''
      );

    const dateMatch =
      !filters.date ||
      (!!session.startTime && toLocalDateString(session.startTime) === filters.date);

    return (
      firmwareMatch &&
      sportMatch &&
      bandMatch &&
      dateMatch
    );
  });
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
                {isExpanded && filteredSessions.length > 0 && (
                  <div className="ml-10 mt-1 space-y-1">
                    {filteredSessions.map((session) => {
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

                {isExpanded && filteredSessions.length === 0 && (
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
