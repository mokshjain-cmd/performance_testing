import { useEffect, useRef, useState } from 'react';
import { Download, HeartPulse, Search, Users as UsersIcon } from 'lucide-react';
import { Layout } from '../components/layout';
import { fitnessAgeApi } from '../services/fitnessAgeApi';
import type { FitnessAgeAdminListItem, FitnessAgeProfile } from '../types/fitnessAge';
import { FitnessAgeDetail } from '../components/fitnessAge';
import Loader from '../components/common/Loader';
import { exportToPDF } from '../utils/pdfExport';

export default function AdminFitnessAgeDashboardPage() {
  const [users, setUsers] = useState<FitnessAgeAdminListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<FitnessAgeProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fitnessAgeApi
      .getAdminUsersList()
      .then((data) => {
        setUsers(data);
        if (data.length > 0) setSelectedId(data[0].fitnessAppUserId);
      })
      .catch((err) => setListError(err.message || 'Failed to load users'))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    setDetailLoading(true);
    setDetailError(null);
    fitnessAgeApi
      .getAdminUserDetail(selectedId)
      .then(setSelectedProfile)
      .catch((err) => setDetailError(err.message || 'Failed to load fitness age detail'))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleDownloadPDF = async () => {
    if (!contentRef.current || !selectedProfile) return;

    setDownloading(true);
    try {
      const sanitizedName = selectedProfile.displayName?.replace(/[^a-z0-9]/gi, '_') || 'user';
      const timestamp = new Date().toISOString().split('T')[0];
      await exportToPDF(contentRef.current, {
        filename: `Fitness_Age_${sanitizedName}_${timestamp}.pdf`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to generate PDF: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setDownloading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout fullWidth>
      <div className="flex gap-6 h-full">
        {/* Left Sidebar — only users we have a Fitness Age snapshot for */}
        <div className="w-80 flex-shrink-0 overflow-y-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                <HeartPulse className="text-green-600" size={18} />
                Fitness Age
              </h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              </div>
            </div>

            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {listLoading ? (
                <div className="p-6">
                  <Loader />
                </div>
              ) : listError ? (
                <div className="p-4 text-xs text-red-600">{listError}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center">
                  <UsersIcon className="mx-auto text-gray-400 mb-2" size={24} />
                  <p className="text-gray-500 text-xs">No Fitness Age data yet.</p>
                  <p className="text-gray-400 text-[11px] mt-1">Run the ETL script to populate this list.</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.fitnessAppUserId}
                    onClick={() => setSelectedId(u.fitnessAppUserId)}
                    className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedId === u.fitnessAppUserId ? 'bg-green-50 border-l-2 border-l-green-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate text-xs">{u.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">
                          {u.isLinked ? u.email : 'Not on this platform'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-800 flex-shrink-0">
                        {u.fitnessAge != null ? u.fitnessAge.toFixed(1) : '—'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {detailLoading ? (
            <Loader />
          ) : detailError ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">{detailError}</div>
          ) : !selectedProfile ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-10 text-center">
              <HeartPulse className="mx-auto text-gray-400 mb-3" size={36} />
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">Select a user</h3>
              <p className="text-sm text-gray-600">Choose a profile from the list to view their Fitness Age.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">{selectedProfile.displayName}</h2>
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
                >
                  <Download size={16} />
                  <span>{downloading ? 'Exporting...' : 'Export PDF'}</span>
                </button>
              </div>
              <div ref={contentRef}>
                <FitnessAgeDetail profile={selectedProfile} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
