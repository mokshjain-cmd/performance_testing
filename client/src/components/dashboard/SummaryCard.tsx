import React from 'react';
import type { UserSummary } from '../../types';
import { splitDateTime } from '../../utils/dateTime';

interface Props {
  userSummary: UserSummary;
}

const CardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-3xl border border-white/40 bg-white/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.06)] p-8 transition-all duration-300 hover:shadow-[0_12px_50px_rgba(0,0,0,0.08)]">
    {children}
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string | number | undefined;
}> = ({ label, value }) => (
  <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-gray-100 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
      {label}
    </div>
    <div className="text-lg font-semibold text-gray-900">
      {value}
    </div>
  </div>
);

const SummaryCards: React.FC<Props> = ({ userSummary }) => {
  const { date, time } = splitDateTime(userSummary.lastUpdated);

  return (
    <div className="flex flex-col gap-10">

      {/* USER INFO */}
      <CardWrapper>
        <div className="mb-6">
          <div className="text-3xl font-semibold tracking-tight text-gray-900">
            {userSummary.userId.name}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {userSummary.userId.email}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard
            label="Total Sessions"
            value={userSummary.totalSessions}
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
          <div className="mb-6 text-lg font-medium text-gray-800">
            Overall Accuracy
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              label="Avg MAE"
              value={userSummary.overallAccuracy.avgMAE?.toFixed(2)}
            />
            <StatCard
              label="Avg RMSE"
              value={userSummary.overallAccuracy.avgRMSE?.toFixed(2)}
            />
            <StatCard
              label="Avg Pearson"
              value={userSummary.overallAccuracy.avgPearson?.toFixed(3)}
            />
            <StatCard
              label="Avg MAPE"
              value={userSummary.overallAccuracy.avgMAPE?.toFixed(2)}
            />
          </div>
        </CardWrapper>
      )}

    </div>
  );
};

export default SummaryCards;
