import React, { useEffect, useState } from 'react';
import axios from 'axios';
import type { Metric } from './MetricsSelector';
import type { SessionFullDetails } from '../../types';
import SessionDetails from '../dashboard/SessionDetails';
import HeartRateChart from '../dashboard/HeartrateChart';
import AnalysisSection from '../dashboard/AnalysisSection';

interface AdminSessionViewProps {
  sessionId: string;
  userId: string;
  metric: Metric;
}

const AdminSessionView: React.FC<AdminSessionViewProps> = ({ sessionId, userId: _userId, metric: _metric }) => {
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch session details
    // API: GET /api/sessions/full/{sessionId}
    setLoading(true);
    axios.get(`http://localhost:3000/api/sessions/full/${sessionId}`)
      .then(res => {
        console.log('Fetched session details:', res.data);
        setSessionDetails(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (!sessionDetails) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No session data available</p>
      </div>
    );
  }

  // Reuse the existing SessionDetails component from tester dashboard
  return (
    <div className="space-y-4">
      <SessionDetails session={sessionDetails.session} />
      <HeartRateChart points={sessionDetails.points} analysis={sessionDetails.analysis} />
      <AnalysisSection analysis={sessionDetails.analysis} />
    </div>
  );
};

export default AdminSessionView;
