import React from 'react';
import type { UserSummary } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  userSummary: UserSummary;
}

const CardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8 transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
    {children}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string | number | undefined;
  description?: string;
}> = ({ label, value, description }) => (
  <div className="bg-gradient-to-br from-gray-50 to-white p-5 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
    <div className="text-xs uppercase tracking-wide text-gray-500 font-medium mb-2">
      {label}
    </div>
    <div className="text-2xl font-bold text-gray-800">
      {value !== undefined ? value : '--'}
    </div>
    {description && (
      <div className="text-xs text-gray-500 mt-2">
        {description}
      </div>
    )}
  </div>
);

const SummaryCards: React.FC<Props> = ({ userSummary }) => {
  // Add 5:30 hours to convert UTC to IST
  const istDate = new Date(new Date(userSummary.lastUpdated).getTime() + (5.5 * 60 * 60 * 1000));
  const { date, time } = splitDateTime(istDate.toISOString());

  return (
    <div className="flex flex-col gap-10">

      {/* USER INFO */}
      <CardWrapper>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {userSummary.userId.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {userSummary.userId.name}
              </div>
              <div className="text-sm text-gray-500">
                {userSummary.userId.email}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Total Sessions"
            value={userSummary.totalSessions ?? 0}
          />
          <StatCard
            label="Last Updated"
            value={`${date} • ${time}`}
          />
        </div>
      </CardWrapper>

      {/* OVERALL ACCURACY */}
      {userSummary.overallAccuracy && (
        <CardWrapper>
          <div className="mb-6 text-xl font-semibold text-gray-800">
            Overall Accuracy Metrics
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Avg MAE"
              value={userSummary.overallAccuracy.avgMAE != null ? `${userSummary.overallAccuracy.avgMAE.toFixed(2)} BPM` : undefined}
              description="Lower is better | Target: <5 BPM"
            />
            <StatCard
              label="Avg RMSE"
              value={userSummary.overallAccuracy.avgRMSE != null ? `${userSummary.overallAccuracy.avgRMSE.toFixed(2)} BPM` : undefined}
              description="Lower is better | Target: <7 BPM"
            />
            <StatCard
              label="Avg Pearson"
              value={userSummary.overallAccuracy.avgPearson != null ? userSummary.overallAccuracy.avgPearson.toFixed(3) : undefined}
              description="Higher is better | Target: >0.9"
            />
            <StatCard
              label="Avg MAPE"
              value={userSummary.overallAccuracy.avgMAPE != null ? userSummary.overallAccuracy.avgMAPE.toFixed(2) : undefined}
              description="Lower is better | Target: <10%"
            />
          </div>
        </CardWrapper>
      )}

    </div>
  );
};

export default SummaryCards;
