import React, { useEffect, useState } from 'react';
import apiClient from '../services/api';
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
  const [selectedMetric, setSelectedMetric] = useState<string>('HR');

  const userId = localStorage.getItem('userId');

  // Reset to overview when metric changes
  useEffect(() => {
    setSelectedSessionId(null);
    setSessionDetails(null);
    setActiveTab('overview');
  }, [selectedMetric]);

  const fetchSessions = () => {
    if (userId) {
      apiClient.get(`/sessions/all?metric=${selectedMetric}`)
        .then(res => {
          setSessions(res.data.data || []);
        })
        .catch((error) => {
          console.error('Error fetching sessions:', error);
          setSessions([]);
        });
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId, selectedMetric]);

  useEffect(() => {
    if (selectedSessionId) {
      setLoading(true);
      apiClient.get(`/sessions/full/${selectedSessionId}`)
        .then(res => {
          setSessionDetails(res.data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching session details:', error);
          setLoading(false);
        });
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (userId && activeTab === 'overview') {
      setSummaryLoading(true);
      apiClient.get(`/users/summary/${userId}?metric=${selectedMetric}`)
        .then(res => {
          setUserSummary(res.data.summary);
          setSummaryLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching user summary:', error);
          setSummaryLoading(false);
        });
    }
  }, [userId, activeTab, selectedMetric]);

  return (
    <DashboardLayout
      sidebar={
        <div className="space-y-4">
          {/* Metric Selector */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Select Metric
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => {
                setSelectedMetric(e.target.value);
                setSelectedSessionId(null); // Reset session selection when metric changes
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white text-sm"
            >
              <option value="HR">Heart Rate (HR)</option>
              <option value="SPO2">Blood Oxygen (SPO2)</option>
              <option value="Sleep">Sleep</option>
              <option value="Calories">Calories</option>
              <option value="Steps">Steps</option>
            </select>
          </div>

          <Sidebar
            sessions={sessions}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedSessionId={selectedSessionId}
            setSelectedSessionId={setSelectedSessionId}
          />
        </div>
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
