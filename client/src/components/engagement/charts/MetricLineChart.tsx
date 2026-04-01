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

interface DataPoint {
  date: string;
  value: number | null;
}

interface MetricLineChartProps {
  data: DataPoint[];
  metricType: 'hr' | 'sleep' | 'activity' | 'spo2';
  label: string;
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
  unit?: string;
}

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
  data,
  metricType,
  label,
  height = 250,
  showLegend = false,
  yAxisLabel = '',
  unit = ''
}) => {
  const color = COLORS[metricType];
  
  const chartData = {
    labels: data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label,
        data: data.map(d => d.value),
        borderColor: color.primary,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, color.gradient[0]);
          gradient.addColorStop(1, color.gradient[1]);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: color.primary,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
        spanGaps: true
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
        labels: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 12,
            weight: 'bold'
          },
          color: COLORS.neutral.text,
          usePointStyle: true,
          padding: 15
        }
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
            return value !== null ? `${label}: ${value.toFixed(1)}${unit}` : 'No data';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: CHART_DEFAULTS.font.family,
            size: 11
          },
          color: COLORS.neutral.textLight,
          maxRotation: 0
        }
      },
      y: {
        beginAtZero: false,
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
          callback: (value) => `${value}${unit}`
        },
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
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
