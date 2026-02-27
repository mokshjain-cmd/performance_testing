import React from 'react';
import type { SessionFullDetails } from '../../types';
import SessionDetails from './SessionDetails';
import AnalysisSection from './AnalysisSection';
import HeartRateChart from './HeartrateChart';
import Loader from '../common/Loader';

interface Props {
  loading: boolean;
  sessionDetails: SessionFullDetails | null;
}


const SessionsTab: React.FC<Props> = ({ loading, sessionDetails }) => {
  if (loading) return <Loader />;
  if (!sessionDetails) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <p className="text-gray-600 text-lg">Select a session to view details</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <SessionDetails session={sessionDetails.session} />
      <HeartRateChart 
        points={sessionDetails.points} 
        analysis={sessionDetails.analysis}
        metric={sessionDetails.session.metric || 'HR'}
      />
      <AnalysisSection analysis={sessionDetails.analysis} />
    </div>
  );
};

export default SessionsTab;
