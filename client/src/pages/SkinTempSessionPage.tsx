import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import type { SessionFullDetails } from '../types';
import SessionDetails from '../components/dashboard/SessionDetails';
import HeartRateChart from '../components/dashboard/HeartrateChart';
import AnalysisSection from '../components/dashboard/AnalysisSection';
import { Thermometer } from 'lucide-react';

interface Props {
  sessionId?: string | null;
}

/**
 * SkinTempSessionPage
 * Uses the same pattern as HR session view - loads /sessions/full/{id}
 * and displays SessionDetails, HeartRateChart (with SkinTemp metric), and AnalysisSection
 */
export const SkinTempSessionPage: React.FC<Props> = ({ sessionId: propSessionId }) => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const sessionId = propSessionId || paramSessionId;
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setSessionDetails(null);
      setLoading(false);
      return;
    }

    const fetchSession = async () => {
      try {
        setLoading(true);
        console.log(`[SkinTemp Session] Fetching session data for: ${sessionId}`);
        const res = await apiClient.get(`/sessions/full/${sessionId}`);
        setSessionDetails(res.data);
        setError(null);
      } catch (err) {
        console.error('[SkinTemp Session] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <Thermometer size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a session to view details</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session data...</p>
        </div>
      </div>
    );
  }

  if (error || !sessionDetails) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>{error || 'No session data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Session metadata (ID, user, activity, devices, firmware, etc.) */}
      <SessionDetails session={sessionDetails.session} />
      
      {/* Temperature timeline chart with device stats (min/max/avg per device) */}
      <HeartRateChart 
        points={sessionDetails.points} 
        analysis={sessionDetails.analysis}
        metric="SkinTemp"
      />
      
      {/* Pairwise comparisons: MAE, RMSE, Pearson R, Mean Bias (same as HR) */}
      <AnalysisSection analysis={sessionDetails.analysis} isAdmin={true} />
    </div>
  );
};

export default SkinTempSessionPage;
