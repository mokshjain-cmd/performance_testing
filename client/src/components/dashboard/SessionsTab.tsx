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
  if (!sessionDetails) return <div>Select a session to view details.</div>;

  return (
    <>
      <SessionDetails session={sessionDetails.session} />
      <AnalysisSection analysis={sessionDetails.analysis} />
      <HeartRateChart points={sessionDetails.points} />
    </>
  );
};

export default SessionsTab;
