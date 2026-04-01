import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { COLORS, CHART_DEFAULTS } from './constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HRDataPoint {
  timestamp: string;
  hr: number;
}

interface HRDetailChartProps {
  data: HRDataPoint[];
  height?: number;
  avgHR?: number;
  minHR?: number;
  maxHR?: number;
}

export const HRDetailChart: React.FC<HRDetailChartProps> = ({
  data,
  height = 350
}) => {
  // Use all 5-minute data points directly instead of averaging into hourly buckets
  // Sort data by timestamp to ensure proper chart rendering
  const sortedData = [...data].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Create labels from actual timestamps
  const labels = sortedData.map(point => {
    const date = new Date(point.timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  });

  // Extract HR values
  const hrValues = sortedData.map(point => point.hr);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: hrValues,
        borderColor: COLORS.hr.primary,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, COLORS.hr.gradient[0]);
          gradient.addColorStop(1, COLORS.hr.gradient[1]);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
        pointBackgroundColor: '#fff',
        pointBorderColor: COLORS.hr.primary,
        pointBorderWidth: 2,
        spanGaps: false
      }
    ]
  };

  const options: ChartOptions<'line'> = {
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
          title: (context) => {
            return context[0].label;
          },
          label: (context) => {
            const value = context.parsed.y;
            return value !== null ? `Heart Rate: ${value.toFixed(0)} bpm` : 'No data';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: CHART_DEFAULTS.grid.color,
          lineWidth: 1
        },
        ticks: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 11
          },
          color: COLORS.neutral.textLight,
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 24,
          callback: function(value, index) {
            // Show every Nth label to avoid crowding
            const label = this.getLabelForValue(value as number);
            // Show label if it's on the hour (ends with :00)
            return label.endsWith(':00') ? label : '';
          }
        }
      },
      y: {
        min: 40,
        max: 200,
        grid: {
          color: CHART_DEFAULTS.grid.color,
          lineWidth: 1
        },
        ticks: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 11
          },
          color: COLORS.neutral.textLight,
          callback: (value) => `${value} bpm`
        },
        title: {
          display: true,
          text: 'Heart Rate (bpm)',
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

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  );
};
