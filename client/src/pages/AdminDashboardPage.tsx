import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import AdminSidebar from '../components/admin/AdminSidebar';
import MetricsSelector from '../components/admin/MetricsSelector';
import SubTabBar from '../components/admin/SubTabBar';
import type { Metric } from '../components/admin/MetricsSelector';
import type { SubTab } from '../components/admin/SubTabBar';
import AdminOverviewTab from '../components/admin/AdminOverviewTab';
import AdminUserView from '../components/admin/AdminUserView';
import AdminSessionView from '../components/admin/AdminSessionView';
import apiClient from '../services/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserWithSessions {
  _id: string;
  name: string;
  email: string;
  sessions: Array<{
    _id: string;
  }>;
}

type ViewType = 'overview' | 'user' | 'session';

const AdminDashboardPage: React.FC = () => {
  const [users, setUsers] = useState<UserWithSessions[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View state
  const [selectedView, setSelectedView] = useState<ViewType>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  // Metric and tab state
  const [selectedMetric, setSelectedMetric] = useState<Metric>('hr');
  const [selectedSubTab, setSelectedSubTab] = useState<SubTab>('overview');

  // Reset to overview and clear sessions when metric changes
  useEffect(() => {
    // Clear all sessions
    setUsers(prev => prev.map(user => ({ ...user, sessions: [] })));
    // Reset view to overview
    setSelectedView('overview');
    setSelectedUserId(null);
    setSelectedSessionId(null);
  }, [selectedMetric]);

  // Fetch all users
  useEffect(() => {
    setLoading(true);
    apiClient.get('/users/')
      .then(res => {
        const usersData = res.data.data || [];
        // Filter to show only tester users
        const testerUsers = usersData.filter((user: User) => user.role === 'tester');
        const usersWithSessions = testerUsers.map((user: User) => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          sessions: []
        }));
        setUsers(usersWithSessions);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setLoading(false);
      });
  }, []);

  // Fetch sessions for a specific user
  const fetchUserSessions = async (userId: string) => {
    try {
      // Convert metric to backend format (hr -> HR, spo2 -> SPO2)
      const metricParam = selectedMetric.toUpperCase();
      const res = await apiClient.get(`/sessions/user/${userId}/ids?metric=${metricParam}`);
      const sessions = res.data.data || [];
      
      // Update the user's sessions in the users array
      setUsers(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, sessions }
          : user
      ));
    } catch (err) {
      console.error('Error fetching user sessions:', err);
    }
  };

  // Handlers
  const handleSelectOverview = () => {
    setSelectedView('overview');
    setSelectedUserId(null);
    setSelectedSessionId(null);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedView('user');
    setSelectedUserId(userId);
    setSelectedSessionId(null);
  };

  const handleSelectSession = (sessionId: string, userId: string) => {
    setSelectedView('session');
    setSelectedUserId(userId);
    setSelectedSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string, userId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await apiClient.delete(`/sessions/${sessionId}`);
      
      // Remove session from user's sessions in state
      setUsers(prev => prev.map(user => 
        user._id === userId 
          ? { ...user, sessions: user.sessions.filter(s => s._id !== sessionId) }
          : user
      ));
      
      // If deleted session was selected, clear selection
      if (selectedSessionId === sessionId) {
        setSelectedView('user');
        setSelectedSessionId(null);
      }
      
      alert('Session deleted successfully');
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Failed to delete session. Please try again.');
    }
  };

  return (
    <Layout fullWidth>
      <div className="flex gap-6 h-full">
        {/* Left Sidebar */}
        <div className="w-80 flex-shrink-0 overflow-y-auto pr-2">
          <AdminSidebar
            users={users}
            activeView={selectedView}
            selectedUserId={selectedUserId}
            selectedSessionId={selectedSessionId}
            selectedMetric={selectedMetric}
            onSelectOverview={handleSelectOverview}
            onSelectUser={handleSelectUser}
            onSelectSession={handleSelectSession}
            onUserExpand={fetchUserSessions}
            onDeleteSession={handleDeleteSession}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                {selectedView === 'overview' && 'Global Overview & Analytics'}
                {selectedView === 'user' && 'User Performance Analysis'}
                {selectedView === 'session' && 'Session Details'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Metrics Selector */}
              <MetricsSelector
                selectedMetric={selectedMetric}
                onSelectMetric={setSelectedMetric}
              />
              
            </div>
          </div>

          {/* Sub Tab Bar - Only show in overview mode */}
          {selectedView === 'overview' && (
            <SubTabBar
              activeTab={selectedSubTab}
              onSelectTab={setSelectedSubTab}
              metric={selectedMetric}
            />
          )}

          {/* Content Area */}
          <div className="pb-8">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            ) : (
              <>
                {selectedView === 'overview' && (
                  <AdminOverviewTab metric={selectedMetric} subTab={selectedSubTab} />
                )}
                
                {selectedView === 'user' && selectedUserId && (
                  <AdminUserView
                    userId={selectedUserId}
                    metric={selectedMetric}
                  />
                )}
                
                {selectedView === 'session' && selectedSessionId && selectedUserId && (
                  <AdminSessionView
                    sessionId={selectedSessionId}
                    userId={selectedUserId}
                    metric={selectedMetric}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AdminDashboardPage;
