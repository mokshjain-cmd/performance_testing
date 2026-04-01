import React from 'react';
import { HRDetailCard } from './HRDetailCard';
import { SleepDetailCard } from './SleepDetailCard';
import { ActivityDetailCard } from './ActivityDetailCard';
import { SpO2DetailCard } from './SpO2DetailCard';
import type { DailyMetrics } from '../../../types/engagement';
import { ChevronLeft } from 'lucide-react';

interface DateDetailViewProps {
  metrics: DailyMetrics;
  onBack?: () => void;
}

export const DateDetailView: React.FC<DateDetailViewProps> = ({ metrics, onBack }) => {
  const dateStr = new Date(metrics.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to summary"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{dateStr}</h2>
                <p className="text-xs text-gray-600 mt-0.5">Detailed metrics for selected date</p>
              </div>
            </div>
          </div>
          
          {/* Engagement Score */}
          <div className="text-center px-3 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="text-[9px] font-medium text-blue-700 uppercase tracking-wide mb-0.5">
              Engagement Score
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {metrics.engagementScore}
            </div>
            <div className="text-[9px] text-blue-600 mt-0.5 font-medium">
              {metrics.engagementScore >= 70 ? 'Excellent' : 
               metrics.engagementScore >= 40 ? 'Good' : 
               'Low'}
            </div>
          </div>
        </div>

        {/* Data Availability Badges */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-600 font-medium">Available:</span>
            <div className="flex gap-1.5 flex-wrap">
              {metrics.hr.hasData && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                  Heart Rate
                </span>
              )}
              {metrics.sleep.hasData && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">
                  Sleep
                </span>
              )}
              {metrics.activity.hasData && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                  Activity
                </span>
              )}
              {metrics.spo2.hasData && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium">
                  Blood Oxygen
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Detail Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <HRDetailCard metrics={metrics} />
        <SleepDetailCard metrics={metrics} />
        <ActivityDetailCard metrics={metrics} />
        <SpO2DetailCard metrics={metrics} />
      </div>
    </div>
  );
};
