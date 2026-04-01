import React from 'react';
import { Wind, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { MetricCard } from '../MetricCard';
import { StatBadge } from '../charts/StatBadge';
import { Line } from 'react-chartjs-2';
import { COLORS, CHART_DEFAULTS } from '../charts/constants';
import type { DailyMetrics } from '../../../types/engagement';
import type { ChartOptions } from 'chart.js';

interface SpO2DetailCardProps {
  metrics: DailyMetrics;
}

export const SpO2DetailCard: React.FC<SpO2DetailCardProps> = ({ metrics }) => {
  const { spo2 } = metrics;
  
  // Console log to see received SpO2 data
  console.log('🫁 [SPO2 DETAIL] Received SpO2 data:', {
    hasData: spo2.hasData,
    avgSpO2: spo2.avgSpO2,
    dataPoints: spo2.dataPoints,
    timeSeriesCount: spo2.timeSeries?.length || 0,
    sampleTimeSeries: spo2.timeSeries?.slice(0, 3)
  });
  
  if (!spo2.hasData || !spo2.avgSpO2) {
    return (
      <MetricCard title="Blood Oxygen" icon={Wind} iconColor="text-green-500">
        <div className="text-center py-8 text-gray-500">
          <Wind className="mx-auto mb-2 opacity-30" size={48} />
          <p>No SpO2 data available for this day</p>
        </div>
      </MetricCard>
    );
  }

  const avgSpO2 = spo2.avgSpO2;
  const minSpO2 = spo2.minSpO2 || avgSpO2 - 2;
  const maxSpO2 = spo2.maxSpO2 || avgSpO2 + 1;
  
  // Use real time-series data if available
  const timeSeriesData = spo2.timeSeries && spo2.timeSeries.length > 0
    ? spo2.timeSeries.map(point => ({
        timestamp: point.timestamp,
        spo2: point.value
      }))
    : [];
  
  // Prepare chart data - group by hour for visualization
  const chartLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const hourlyAvgData = timeSeriesData.length > 0 
    ? Array.from({ length: 24 }, (_, hour) => {
        const hourData = timeSeriesData.filter(d => {
          const time = new Date(d.timestamp);
          return time.getHours() === hour;
        });
        
        if (hourData.length === 0) return null;
        const sum = hourData.reduce((acc, d) => acc + d.spo2, 0);
        return sum / hourData.length;
      })
    : new Array(24).fill(null);

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: 'SpO2 %',
        data: hourlyAvgData,
        borderColor: COLORS.spo2.primary,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, COLORS.spo2.gradient[0]);
          gradient.addColorStop(1, COLORS.spo2.gradient[1]);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: COLORS.spo2.primary,
        pointBorderWidth: 2,
        spanGaps: true
      }
    ]
  };

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: CHART_DEFAULTS.tooltip.backgroundColor,
        titleColor: CHART_DEFAULTS.tooltip.titleColor,
        bodyColor: CHART_DEFAULTS.tooltip.bodyColor,
        borderColor: CHART_DEFAULTS.tooltip.borderColor,
        borderWidth: CHART_DEFAULTS.tooltip.borderWidth,
        padding: CHART_DEFAULTS.tooltip.padding,
        cornerRadius: CHART_DEFAULTS.tooltip.cornerRadius,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return value !== null ? `SpO2: ${value.toFixed(1)}%` : 'No data';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: CHART_DEFAULTS.grid.color
        },
        ticks: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 11
          },
          color: COLORS.neutral.textLight,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 13,
          callback: function(value, index) {
            return index % 2 === 0 ? this.getLabelForValue(value as number) : '';
          }
        }
      },
      y: {
        min: 88,
        max: 100,
        grid: {
          color: CHART_DEFAULTS.grid.color
        },
        ticks: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 11
          },
          color: COLORS.neutral.textLight,
          callback: (value) => `${value}%`
        },
        title: {
          display: true,
          text: 'Blood Oxygen (%)',
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 12,
            weight: 'bold'
          },
          color: COLORS.neutral.text
        }
      }
    },
    animation: CHART_DEFAULTS.animation
  };

  // Determine health status
  const getHealthStatus = () => {
    if (avgSpO2 >= 95) return { level: 'excellent', icon: CheckCircle, color: 'green', text: 'Normal Range' };
    if (avgSpO2 >= 90) return { level: 'warning', icon: AlertTriangle, color: 'yellow', text: 'Borderline' };
    return { level: 'critical', icon: AlertTriangle, color: 'red', text: 'Concerning' };
  };

  const healthStatus = getHealthStatus();
  const StatusIcon = healthStatus.icon;
  
  // Calculate time in zones
  const getTimeInZones = () => {
    const normal = hourlyAvgData.filter(v => v && v >= 95).length;
    const warning = hourlyAvgData.filter(v => v && v >= 90 && v < 95).length;
    const critical = hourlyAvgData.filter(v => v && v < 90).length;
    const total = normal + warning + critical;
    
    return {
      normal: total > 0 ? (normal / total) * 100 : 0,
      warning: total > 0 ? (warning / total) * 100 : 0,
      critical: total > 0 ? (critical / total) * 100 : 0
    };
  };
  
  const timeInZones = getTimeInZones();

  return (
    <MetricCard title="Blood Oxygen Analysis" icon={Wind} iconColor="text-green-500">
      <div className="space-y-3">
        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBadge
            label="Avg SpO2"
            value={avgSpO2.toFixed(1)}
            unit="%"
            color="green"
            size="sm"
            icon={<Wind size={16} />}
          />
          <StatBadge
            label="Min SpO2"
            value={minSpO2.toFixed(1)}
            unit="%"
            color="blue"
            size="sm"
          />
          <StatBadge
            label="Max SpO2"
            value={maxSpO2.toFixed(1)}
            unit="%"
            color="green"
            size="sm"
          />
          <StatBadge
            label="Data Points"
            value={spo2.dataPoints.toLocaleString()}
            color="gray"
            size="sm"
            icon={<Activity size={16} />}
          />
        </div>

        {/* Health Status Banner */}
        <div className={`bg-gradient-to-r ${
          healthStatus.color === 'green' ? 'from-green-50 to-emerald-50 border-green-200' :
          healthStatus.color === 'yellow' ? 'from-yellow-50 to-amber-50 border-yellow-200' :
          'from-red-50 to-rose-50 border-red-200'
        } border rounded-lg p-4`}>
          <div className="flex items-center gap-3">
            <StatusIcon className={`${
              healthStatus.color === 'green' ? 'text-green-600' :
              healthStatus.color === 'yellow' ? 'text-yellow-600' :
              'text-red-600'
            }`} size={32} />
            <div className="flex-1">
              <div className={`text-lg font-bold ${
                healthStatus.color === 'green' ? 'text-green-900' :
                healthStatus.color === 'yellow' ? 'text-yellow-900' :
                'text-red-900'
              }`}>
                {healthStatus.text}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {healthStatus.color === 'green' && 'Your blood oxygen levels are within healthy range (95-100%)'}
                {healthStatus.color === 'yellow' && 'Your blood oxygen is borderline. Consider consulting a healthcare provider.'}
                {healthStatus.color === 'red' && 'Low blood oxygen detected. Please consult a healthcare provider.'}
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gradient-to-b from-gray-50 to-white rounded-lg p-3 border border-gray-200">
          {timeSeriesData.length > 0 ? (
            <div style={{ height: '300px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No detailed SpO2 data available</p>
              <p className="text-xs mt-2">Only summary statistics are available for this day</p>
            </div>
          )}
        </div>

        {/* Time in Zones */}
        <div className="bg-gradient-to-b from-green-50 to-white rounded-lg p-3 border border-green-200">
          <div className="text-xs font-semibold text-green-900 mb-3">Time in SpO2 Zones</div>
          <div className="space-y-3">
            {/* Normal Zone */}
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-700 font-medium">Normal (95-100%)</span>
                </div>
                <span className="text-green-700 font-bold">{timeInZones.normal.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${timeInZones.normal}%` }}
                />
              </div>
            </div>

            {/* Warning Zone */}
            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-gray-700 font-medium">Borderline (90-94%)</span>
                </div>
                <span className="text-yellow-700 font-bold">{timeInZones.warning.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${timeInZones.warning}%` }}
                />
              </div>
            </div>

            {/* Critical Zone */}
            {timeInZones.critical > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-700 font-medium">Low (&lt;90%)</span>
                  </div>
                  <span className="text-red-700 font-bold">{timeInZones.critical.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${timeInZones.critical}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-medium mb-1">About Blood Oxygen Levels</p>
              <p className="text-blue-700 text-xs">
                Normal SpO2 levels are between 95-100%. Levels below 90% may indicate hypoxemia and require medical attention. 
                Factors like altitude, lung conditions, and sleep apnea can affect readings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MetricCard>
  );
};
