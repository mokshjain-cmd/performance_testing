import React, { useEffect, useState } from 'react';
import axios from 'axios';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import Sidebar from '../components/dashboard/Sidebar';
import OverviewTab from '../components/dashboard/OverviewTab';
import SessionsTab from '../components/dashboard/SessionsTab';
import type { Session, SessionFullDetails, UserSummary } from '../types';

const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');

  const userId = localStorage.getItem('userId');

  const fetchSessions = () => {
    if (userId) {
      axios.get(`http://localhost:3000/api/sessions/all/${userId}`)
        .then(res => setSessions(res.data.data || []))
        .catch(() => setSessions([]));
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  useEffect(() => {
    if (selectedSessionId) {
      setLoading(true);
      axios.get(`http://localhost:3000/api/sessions/full/${selectedSessionId}`)
        .then(res => {
          console.log('Fetched session details:', res.data);
          setSessionDetails(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (userId && activeTab === 'overview') {
      setSummaryLoading(true);
      axios.get(`http://localhost:3000/api/users/summary/${userId}`)
        .then(res => {
          setUserSummary(res.data.summary);
          setSummaryLoading(false);
        })
        .catch(() => setSummaryLoading(false));
    }
  }, [userId, activeTab]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/sessions/${sessionId}`);
      
      // If the deleted session was selected, clear selection
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null);
        setSessionDetails(null);
      }
      
      // Refresh the sessions list
      fetchSessions();
      
      alert('Session deleted successfully!');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session. Please try again.');
    }
  };

  return (
    <DashboardLayout
      sidebar={
        <Sidebar
          sessions={sessions}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
          onDeleteSession={handleDeleteSession}
        />
      }
    >
      {activeTab === 'overview' ? (
        <OverviewTab
          userSummary={userSummary}
          loading={summaryLoading}
        />
      ) : (
        <SessionsTab
          loading={loading}
          sessionDetails={sessionDetails}
        />
      )}
    </DashboardLayout>
  );
};

export default DashboardPage;
