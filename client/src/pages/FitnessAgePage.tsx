import { useEffect, useState } from 'react';
import { HeartPulse, ShieldAlert } from 'lucide-react';
import { Layout } from '../components/layout';
import { fitnessAgeApi } from '../services/fitnessAgeApi';
import type { MyFitnessAgeResponse } from '../types/fitnessAge';
import { FitnessAgeDetail } from '../components/fitnessAge';
import Loader from '../components/common/Loader';

export default function FitnessAgePage() {
  const [response, setResponse] = useState<MyFitnessAgeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fitnessAgeApi
      .getMyFitnessAge()
      .then(setResponse)
      .catch((err) => setError(err.message || 'Failed to load your Fitness Age'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <HeartPulse className="text-green-600" size={26} />
          <h1 className="text-2xl font-bold text-gray-900">Fitness Age</h1>
        </div>

        {loading && <Loader />}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && response && !response.linked && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <ShieldAlert className="mx-auto text-amber-500 mb-3" size={36} />
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">Not linked yet</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {response.message || "Ask your admin to link your account to a Fitness Age profile — once it's linked, it'll show up here."}
            </p>
          </div>
        )}

        {!loading && !error && response && response.linked && !response.computed && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <HeartPulse className="mx-auto text-gray-300 mb-3" size={36} />
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">Not computed yet</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto">
              {response.message || "Your account is linked, but a Fitness Age snapshot hasn't been generated yet."}
            </p>
          </div>
        )}

        {!loading && !error && response?.computed && response.data && (
          <FitnessAgeDetail profile={response.data} />
        )}
      </div>
    </Layout>
  );
}
