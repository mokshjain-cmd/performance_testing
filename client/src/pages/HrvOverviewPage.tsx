import { HeartPulse } from 'lucide-react';
import { Layout } from '../components/layout';
import { HrvOverviewContent } from '../components/hrv/HrvOverviewContent';

export default function HrvOverviewPage() {
  return (
    <Layout>
      <div className="mb-6 flex items-center gap-2">
        <HeartPulse className="text-indigo-600" size={24} />
        <h1 className="text-xl font-bold text-gray-900">HRV</h1>
      </div>
      <HrvOverviewContent />
    </Layout>
  );
}
