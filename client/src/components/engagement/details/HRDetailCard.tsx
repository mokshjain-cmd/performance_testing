import React from 'react';
import { Heart, Clock, Activity as ActivityIcon, Zap } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { StatBadge } from '../charts/StatBadge';
import { HRDetailChart } from '../charts/HRDetailChart';
import type { DailyMetrics } from '../../../types/engagement';

interface HRDetailCardProps {
  metrics: DailyMetrics;
}

export const HRDetailCard: React.FC<HRDetailCardProps> = ({ metrics }) => {
  const { hr } = metrics;
  
  // Console log to see received HR data
  console.log('💓 [HR DETAIL] Received HR data:', {
    hasData: hr.hasData,
    avgHR: hr.avgHR,
    dataPoints: hr.dataPoints,
    timeSeriesCount: hr.timeSeries?.length || 0,
    sampleTimeSeries: hr.timeSeries?.slice(0, 3)
  });
  
  if (!hr.hasData || !hr.avgHR) {
    return (
      <MetricCard title="Heart Rate" icon={Heart} iconColor="text-red-500">
        <div className="text-center py-8 text-gray-500">
          <Heart className="mx-auto mb-2 opacity-30" size={48} />
          <p>No heart rate data available for this day</p>
        </div>
      </MetricCard>
    );
  }

  // Use real time-series data if available, otherwise show message
  const timeSeriesData = hr.timeSeries && hr.timeSeries.length > 0
    ? hr.timeSeries.map(point => ({
        timestamp: point.timestamp,
        hr: point.value
      }))
    : [];
  
  const wearTimeHours = hr.wearTimeMinutes ? Math.floor(hr.wearTimeMinutes / 60) : 0;
  const wearTimeMinutes = hr.wearTimeMinutes ? hr.wearTimeMinutes % 60 : 0;

  // Calculate HR variability (HRV approximation)
  const hrVariability = hr.maxHR && hr.minHR ? hr.maxHR - hr.minHR : 0;
  
  return (
    <MetricCard title="Heart Rate Analysis" icon={Heart} iconColor="text-red-500">
      <div className="space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBadge
            label="Avg HR"
            value={hr.avgHR.toFixed(0)}
            unit="bpm"
            color="red"
            size="sm"
            icon={<Heart size={16} />}
          />
          <StatBadge
            label="Min HR"
            value={hr.minHR?.toFixed(0) || 'N/A'}
            unit="bpm"
            color="blue"
            size="sm"
          />
          <StatBadge
            label="Max HR"
            value={hr.maxHR?.toFixed(0) || 'N/A'}
            unit="bpm"
            color="red"
            size="sm"
          />
          <StatBadge
            label="Wear Time"
            value={wearTimeHours > 0 ? `${wearTimeHours}h ${wearTimeMinutes}m` : `${wearTimeMinutes}m`}
            color="gray"
            size="sm"
            icon={<Clock size={16} />}
          />
        </div>

        {/* Chart */}
        <div className="bg-gradient-to-b from-gray-50 to-white rounded-lg p-3 border border-gray-200">
          {timeSeriesData.length > 0 ? (
            <HRDetailChart
              data={timeSeriesData}
              height={300}
              avgHR={hr.avgHR}
              minHR={hr.minHR}
              maxHR={hr.maxHR}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No detailed HR data available</p>
              <p className="text-xs mt-2">Only summary statistics are available for this day</p>
            </div>
          )}
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-red-50 to-white rounded-lg p-3 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <ActivityIcon className="text-red-500" size={18} />
              <span className="text-xs font-medium text-gray-700 uppercase">HR Variability</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{hrVariability}</div>
            <div className="text-xs text-gray-600 mt-1">bpm range</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg p-4 border border-orange-100">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="text-orange-500" size={18} />
              <span className="text-xs font-medium text-gray-700 uppercase">Data Points</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{hr.dataPoints.toLocaleString()}</div>
            <div className="text-xs text-gray-600 mt-1">readings captured</div>
          </div>
        </div>

        {/* HR Zones Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-semibold text-blue-900 mb-3">Heart Rate Zones</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }}></div>
              <span className="text-gray-700"><strong>Resting:</strong> 40-100 bpm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(16, 185, 129, 0.3)' }}></div>
              <span className="text-gray-700"><strong>Fat Burn:</strong> 100-130 bpm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(251, 146, 60, 0.3)' }}></div>
              <span className="text-gray-700"><strong>Cardio:</strong> 130-160 bpm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }}></div>
              <span className="text-gray-700"><strong>Peak:</strong> 160+ bpm</span>
            </div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
};
