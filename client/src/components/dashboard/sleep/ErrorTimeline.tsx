import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ErrorTimelineProps {
  epochs: Array<{
    timestamp: number;
    lunaStage: string;
    benchmarkStage: string;
    agreement: boolean;
  }>;
}

export const ErrorTimeline: React.FC<ErrorTimelineProps> = ({ epochs }) => {
  // Filter only disagreements
  const errors = epochs.filter((e) => !e.agreement);

  // Convert to chart data
  const data = errors.map((error) => {
    const date = new Date(error.timestamp * 1000);
    const timeOfNight = date.getHours() * 60 + date.getMinutes(); // minutes from midnight
    return {
      timeOfNight,
      timeDisplay: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      lunaStage: error.lunaStage,
      benchmarkStage: error.benchmarkStage,
      errorType: `${error.benchmarkStage} → ${error.lunaStage}`,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.timeDisplay}</p>
          <p className="text-sm">
            <span className="text-red-600">Falcon:</span> {data.lunaStage}
          </p>
          <p className="text-sm">
            <span className="text-green-600">Benchmark:</span> {data.benchmarkStage}
          </p>
        </div>
      );
    }
    return null;
  };

  if (errors.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">No disagreements found - perfect agreement!</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-2">Disagreement Timeline</h3>
      <p className="text-sm text-gray-600 mb-4">
        {errors.length} epochs with disagreement between Falcon and benchmark
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="timeOfNight"
              name="Time"
              domain={[0, 1440]}
              ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
              tickFormatter={(value) => {
                const hours = Math.floor(value / 60);
                const mins = value % 60;
                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
              }}
              label={{ value: 'Time of Night', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type="category"
              dataKey="errorType"
              name="Error Type"
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data} fill="#ef4444" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
