import React, { useState, useEffect } from 'react';
import { engagementApi } from '../services/engagementApi';
import type { EngagementUser, UserOverview, EngagementStats, UserStatus } from '../types/engagement';
import { Users, TrendingUp, AlertCircle, Activity, Info } from 'lucide-react';
import { UserSummaryView, DateDetailView } from '../components/engagement';

const UserEngagementDashboardPage: React.FC = () => {
  // State
  const [users, setUsers] = useState<EngagementUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOverview | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [filter, setFilter] = useState<'all' | UserStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, statsData] = await Promise.all([
        engagementApi.getAllUsers(),
        engagementApi.getStats()
      ]);
      console.log('📊 [ENGAGEMENT] Fetched users data:', usersData);
      console.log('📊 [ENGAGEMENT] Fetched stats data:', statsData);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load engagement data');
      console.error('Error fetching engagement data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch selected user details
  const handleUserSelect = async (userId: string) => {
    if (selectedUser?.userId === userId) return;
    
    try {
      setSelectedDate(null);
      const userOverview = await engagementApi.getUserOverview(userId, dateRange);
      console.log('📊 [ENGAGEMENT] User overview data for userId:', userId, userOverview);
      console.log('📊 [ENGAGEMENT] User metrics count:', userOverview?.metrics?.length);
      if (userOverview?.metrics?.length > 0) {
        console.log('📊 [ENGAGEMENT] Sample metric data:', userOverview.metrics[0]);
      }
      setSelectedUser(userOverview);
    } catch (err: any) {
      console.error('Error fetching user overview:', err);
      setError('Failed to load user details');
    }
  };

  // Handle date range change
  useEffect(() => {
    if (selectedUser) {
      handleUserSelect(selectedUser.userId);
    }
  }, [dateRange]);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.status === filter;
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading engagement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="text-green-600" size={28} />
                User Engagement Monitoring
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track device usage and identify inactive users
              </p>
            </div>
            
            {/* Stats Summary */}
            {stats && (
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-center px-4 py-2 bg-white rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-600">Total Users</div>
                  <div className="text-lg font-bold text-gray-900">{stats.totalUsers}</div>
                </div>
                <div className="text-center px-4 py-2 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-xs text-green-600">Active</div>
                  <div className="text-lg font-bold text-green-800">{stats.activeUsers}</div>
                </div>
                <div className="text-center px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-xs text-yellow-600">At Risk</div>
                  <div className="text-lg font-bold text-yellow-800">{stats.decliningUsers}</div>
                </div>
                <div className="text-center px-4 py-2 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-xs text-red-600">Inactive</div>
                  <div className="text-lg font-bold text-red-800">{stats.inactiveUsers}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
            <button
              onClick={fetchData}
              className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Date Range & Date Selector Top Bar */}
      {selectedUser && (
        <div className="max-w-[1920px] mx-auto px-6 pt-3">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-3 mb-3">
            <div className="flex items-center justify-between gap-4">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Date Range:</span>
                <div className="flex gap-1.5">
                  {[7, 14, 30, 60].map((days) => (
                    <button
                      key={days}
                      onClick={() => setDateRange(days)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        dateRange === days
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates with Data - Horizontal Scroll */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {selectedUser.metrics.map((metric) => (
                    <button
                      key={metric._id}
                      onClick={() => setSelectedDate(metric.date)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg border transition-colors ${
                        selectedDate === metric.date
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium whitespace-nowrap">
                          {new Date(metric.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        <span className={`text-xs font-semibold ${
                          selectedDate === metric.date ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {metric.engagementScore}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {metric.hr.hasData && (
                          <span className={`w-2 h-2 rounded-full ${
                            selectedDate === metric.date ? 'bg-red-300' : 'bg-red-500'
                          }`} title="HR"></span>
                        )}
                        {metric.sleep.hasData && (
                          <span className={`w-2 h-2 rounded-full ${
                            selectedDate === metric.date ? 'bg-purple-300' : 'bg-purple-500'
                          }`} title="Sleep"></span>
                        )}
                        {metric.activity.hasData && (
                          <span className={`w-2 h-2 rounded-full ${
                            selectedDate === metric.date ? 'bg-blue-300' : 'bg-blue-500'
                          }`} title="Activity"></span>
                        )}
                        {metric.spo2.hasData && (
                          <span className={`w-2 h-2 rounded-full ${
                            selectedDate === metric.date ? 'bg-green-300' : 'bg-green-500'
                          }`} title="SpO2"></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="max-w-[1920px] mx-auto px-6 py-3">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Panel - User List */}
          <div className="col-span-12 lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 overflow-hidden sticky top-24 max-h-[calc(100vh-120px)]">
              {/* Search & Filters */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent text-xs transition-all"
                  />
                  <Users className="absolute left-3 top-3 text-gray-400" size={16} />
                </div>
                
                {/* Filter Dropdown */}
                <div className="relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as 'all' | UserStatus)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium text-gray-700 cursor-pointer transition-all appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active Users</option>
                    <option value="declining">At Risk Users</option>
                    <option value="inactive">Inactive Users</option>
                  </select>
                </div>
              </div>

              {/* User List */}
              <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center">
                    <Activity className="mx-auto text-gray-400 mb-2" size={28} />
                    <p className="text-gray-600 text-xs">No users found</p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.userId}
                      onClick={() => handleUserSelect(user.userId)}
                      className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        selectedUser?.userId === user.userId ? 'bg-blue-50 border-l-3 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-xs">{user.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                        </div>
                        <span className={`ml-2 w-1.5 h-1.5 rounded-full mt-1 ${
                          user.status === 'active' ? 'bg-green-500' :
                          user.status === 'declining' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-600">Score:</span>
                        <span className={`font-semibold ${
                          user.avgEngagementScore >= 70 ? 'text-green-600' :
                          user.avgEngagementScore >= 40 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {user.avgEngagementScore}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600">
                          {user.consecutiveInactiveDays === 0 ? 'Today' : `${user.consecutiveInactiveDays}d inactive`}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
         <div className="col-span-12 lg:col-span-10">
            {!selectedUser ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 text-center">
                <Activity className="mx-auto text-gray-400 mb-3" size={40} />
                <h3 className="text-base font-semibold text-gray-900 mb-1.5">Select a User</h3>
                <p className="text-sm text-gray-600">Choose a user from the list to view their engagement metrics</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* User Overview Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 overflow-hidden">
                  {/* Header Section */}
                  <div className="relative bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-100/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-base font-bold text-gray-900 mb-0.5">{selectedUser.name}</h2>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-600">{selectedUser.email}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                            selectedUser.status === 'active' 
                              ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20' 
                              : selectedUser.status === 'declining' 
                              ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/20' 
                              : 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                          }`}>
                            {selectedUser.status === 'active' ? 'Active' : selectedUser.status === 'declining' ? 'At Risk' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-px bg-gray-200">
                    {/* Avg Engagement Score */}
                    <div className="bg-white p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-white transition-all duration-300 group">
                      <div className="flex flex-col h-full">
                        <div className="flex items-center gap-1 mb-1.5">
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                            Avg Engagement Score
                          </span>
                          <div className="relative group/tooltip">
                            <Info size={11} className="text-gray-400 cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity z-10">
                              0-100 score based on HR, Sleep, Activity, SpO2 & Workouts
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold mb-0.5 ${
                          selectedUser.avgEngagementScore >= 70 ? 'text-green-600' :
                          selectedUser.avgEngagementScore >= 40 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {selectedUser.avgEngagementScore}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-auto">
                          {selectedUser.avgEngagementScore >= 70 ? 'Excellent' :
                           selectedUser.avgEngagementScore >= 40 ? 'Fair' : 'Poor'}
                        </div>
                      </div>
                    </div>

                    {/* Days Active */}
                    <div className="bg-white p-3 hover:bg-gradient-to-br hover:from-green-50 hover:to-white transition-all duration-300 group">
                      <div className="flex flex-col h-full">
                        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                          Days Active
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-0.5">
                          {selectedUser.totalDays}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-auto">
                          tracking days
                        </div>
                      </div>
                    </div>

                    {/* Days Inactive */}
                    <div className="bg-white p-3 hover:bg-gradient-to-br hover:from-amber-50 hover:to-white transition-all duration-300 group">
                      <div className="flex flex-col h-full">
                        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                          Days Inactive
                        </div>
                        <div className={`text-2xl font-bold mb-0.5 ${
                          selectedUser.consecutiveInactiveDays === 0 ? 'text-green-600' :
                          selectedUser.consecutiveInactiveDays < 7 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {selectedUser.consecutiveInactiveDays}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-auto">
                          {selectedUser.consecutiveInactiveDays === 0 ? 'current streak' : 'consecutive'}
                        </div>
                      </div>
                    </div>

                    {/* Last Active */}
                    <div className="bg-white p-3 hover:bg-gradient-to-br hover:from-purple-50 hover:to-white transition-all duration-300 group">
                      <div className="flex flex-col h-full">
                        <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                          Last Active
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mb-0.5">
                          {selectedUser.lastActiveDate
                            ? new Date(selectedUser.lastActiveDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'Never'}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-auto">
                          {selectedUser.lastActiveDate 
                            ? new Date(selectedUser.lastActiveDate).toLocaleDateString('en-US', { year: 'numeric' })
                            : 'no data'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Content: Summary View or Date Detail View */}
                {selectedDate ? (
                  (() => {
                    const dateMetrics = selectedUser.metrics.find(m => m.date === selectedDate);
                    return dateMetrics ? (
                      <DateDetailView 
                        metrics={dateMetrics} 
                        onBack={() => setSelectedDate(null)}
                      />
                    ) : (
                      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-6 text-center">
                        <p className="text-gray-600">Metrics not found for selected date</p>
                      </div>
                    );
                  })()
                ) : (
                  <UserSummaryView userOverview={selectedUser} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserEngagementDashboardPage;
                