import React, { useEffect, useState, useRef } from 'react';
import apiClient from '../../services/api';
import { exportToPDF, generateSessionFilename } from '../../utils/pdfExport';
import type { Metric } from './MetricsSelector';
import type { SessionFullDetails } from '../../types';
import SessionDetails from '../dashboard/SessionDetails';
import HeartRateChart from '../dashboard/HeartrateChart';
import AnalysisSection from '../dashboard/AnalysisSection';
import { Download } from 'lucide-react';

interface AdminSessionViewProps {
  sessionId: string;
  userId: string;
  metric: Metric;
}

const AdminSessionView: React.FC<AdminSessionViewProps> = ({ sessionId, userId: _userId, metric: _metric }) => {
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !sessionDetails) return;

    setDownloading(true);
    try {
      const filename = generateSessionFilename(
        sessionDetails.session.name,
        sessionId
      );
      
      await exportToPDF(contentRef.current, { filename });
    } catch (error) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    // TODO: Fetch session details
    // API: GET /api/sessions/full/{sessionId}
    setLoading(true);
    apiClient.get(`/sessions/full/${sessionId}`)
      .then(res => {
        setSessionDetails(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching session details:', err);
        setLoading(false);
      });
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
      {/* Exportable Content */}
      <div ref={contentRef} className="space-y-4 bg-white p-6 rounded-lg">
        <SessionDetails 
          session={sessionDetails.session}
          actionButton={
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            >
              <Download size={16} />
              <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
            </button>
          }
        />
        <HeartRateChart 
          points={sessionDetails.points} 
          analysis={sessionDetails.analysis}
          metric={sessionDetails.session.metric || 'HR'}
        />
        <AnalysisSection analysis={sessionDetails.analysis} isAdmin={true} />
      </div>
    </div>
  );
};

export default AdminSessionView;
