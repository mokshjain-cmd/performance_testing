import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { SleepEpoch } from '../../../types/sleep.types';

interface HypnogramChartProps {
  lunaEpochs: SleepEpoch[];
  benchmarkEpochs?: SleepEpoch[];
  showComparison?: boolean;
}

// Map sleep stages to numeric values for visualization
const stageToValue = {
  AWAKE: 4,
  REM: 3,
  LIGHT: 2,
  DEEP: 1,
};

const valueToStage = ['', 'DEEP', 'LIGHT', 'REM', 'AWAKE'];

export const HypnogramChart: React.FC<HypnogramChartProps> = ({
  lunaEpochs,
  benchmarkEpochs,
  showComparison = false,
}) => {
  // Determine if we have benchmark epochs for comparison
  const hasBenchmarkEpochs = benchmarkEpochs && benchmarkEpochs.length > 0;
  
  // Helper to extract time from ISO string (show UTC, no timezone conversion)
  const formatTimeFromISO = (timestamp: string | Date): string => {
    const isoString = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
    const match = isoString.match(/T(\d{2}:\d{2})/);
    if (match) {
      // Convert 24h to 12h format with AM/PM
      const [hours, minutes] = match[1].split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hour12 = hours % 12 || 12;
      return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    return 'N/A';
  };

  // Prepare data for the chart
  const chartData = lunaEpochs.map((epoch, index) => {
    const timeStr = formatTimeFromISO(epoch.timestamp);

    const dataPoint: any = {
      time: timeStr,
      timestamp: epoch.timestamp,
      luna: stageToValue[epoch.stage],
      lunaStage: epoch.stage,
    };

    // Add benchmark data if available
    if (showComparison && benchmarkEpochs && benchmarkEpochs[index]) {
      dataPoint.benchmark = stageToValue[benchmarkEpochs[index].stage];
      dataPoint.benchmarkStage = benchmarkEpochs[index].stage;
    }

    return dataPoint;
  });

  // Sample data for better performance (show every 4th point if > 500 epochs)
  const displayData =
    chartData.length > 500
      ? chartData.filter((_, i) => i % 4 === 0)
      : chartData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{payload[0].payload.time}</p>
          <p className="text-blue-600">
            Falcon: {payload[0].payload.lunaStage}
          </p>
          {showComparison && payload[0].payload.benchmarkStage && (
            <p className="text-green-600">
              Benchmark: {payload[0].payload.benchmarkStage}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80">
      {showComparison && !hasBenchmarkEpochs && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ℹ️ Showing Luna only — Benchmark epoch data unavailable (summary metrics only)
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 5]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={(value) => valueToStage[value] || ''}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="stepAfter"
            dataKey="luna"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="Falcon"
          />
          {showComparison && hasBenchmarkEpochs && (
            <Line
              type="stepAfter"
              dataKey="benchmark"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Benchmark"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
