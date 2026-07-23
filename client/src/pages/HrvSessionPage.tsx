import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, HeartPulse } from 'lucide-react';
import { Layout } from '../components/layout';
import { HrvSessionContent } from '../components/hrv/HrvSessionContent';

export default function HrvSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/hrv')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <HeartPulse className="text-indigo-600" size={24} />
        <h1 className="text-xl font-bold text-gray-900">HRV Session</h1>
      </div>
      <HrvSessionContent sessionId={sessionId ?? null} showHeader />
    </Layout>
  );
}
