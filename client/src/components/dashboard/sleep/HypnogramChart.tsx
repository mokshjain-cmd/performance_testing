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
  // Prepare data for the chart
  const chartData = lunaEpochs.map((epoch, index) => {
    const time = new Date(epoch.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

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
            Luna: {payload[0].payload.lunaStage}
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
            name="Luna"
          />
          {showComparison && benchmarkEpochs && (
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
