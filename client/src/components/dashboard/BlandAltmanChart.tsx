import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Label } from 'recharts';

interface BlandAltmanData {
  differences: number[];
  averages: number[];
  meanDifference: number;
  stdDifference: number;
  upperLimit: number;
  lowerLimit: number;
  percentageInLimits: number;
}

interface BlandAltmanChartProps {
  blandAltmanData: BlandAltmanData;
  metric: string;
  device1: string;
  device2: string;
}

const BlandAltmanChart: React.FC<BlandAltmanChartProps> = ({
  blandAltmanData,
  metric,
  device1,
  device2,
}) => {
  if (!blandAltmanData || !blandAltmanData.averages || !blandAltmanData.differences) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>No Bland-Altman data available</p>
      </div>
    );
  }

  // Check for empty data arrays
  if (blandAltmanData.averages.length === 0 || blandAltmanData.differences.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <p>Insufficient data points for Bland-Altman analysis</p>
      </div>
    );
  }

  // Prepare data for scatter plot
  const data = blandAltmanData.averages.map((avg, i) => ({
    average: avg,
    difference: blandAltmanData.differences[i],
  }));

  const { meanDifference, upperLimit, lowerLimit, percentageInLimits } = blandAltmanData;

  // Determine unit based on metric
  const getUnit = (metric: string) => {
    if (metric === 'HR') return 'BPM';
    if (metric === 'SPO2') return '%';
    if (metric === 'Steps') return 'steps';
    if (metric === 'Calories') return 'cal';
    return '';
  };
  const unit = getUnit(metric);

  // Calculate X-axis domain to start from data range, not 0
  const minAverage = Math.min(...blandAltmanData.averages);
  const maxAverage = Math.max(...blandAltmanData.averages);
  const range = maxAverage - minAverage;
  const buffer = range > 0 ? range * 0.05 : 5; // 5% buffer or 5 units if range is small
  const xAxisDomain = [minAverage - buffer, maxAverage + buffer];

  return (
    <div className="space-y-4">
      {/* Chart Title and Info */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">Bland-Altman Plot</h4>
          <p className="text-sm text-gray-600">
            Agreement Analysis: {device1} vs {device2} for {metric}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Assesses the agreement between two measurement methods by plotting the difference against the average
          </p>
        </div>
        <div className="text-right bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-500">Within Limits of Agreement</div>
          <div className="text-lg font-semibold text-green-600">{percentageInLimits.toFixed(1)}%</div>
          <div className="text-xs text-gray-500 mt-1">Outside Limits</div>
          <div className="text-sm font-semibold text-red-600">{(100 - percentageInLimits).toFixed(1)}%</div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Mean Difference (Bias)</div>
          <div className="text-lg font-semibold text-blue-600">{meanDifference.toFixed(2)} {unit}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Upper Limit (+1.96 SD)</div>
          <div className="text-lg font-semibold text-red-600">{upperLimit.toFixed(2)} {unit}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-1">Lower Limit (-1.96 SD)</div>
          <div className="text-lg font-semibold text-red-600">{lowerLimit.toFixed(2)} {unit}</div>
        </div>
      </div>

      {/* Bland-Altman Scatter Plot */}
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 60, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          
          <XAxis 
            type="number" 
            dataKey="average" 
            name="Average"
            domain={xAxisDomain}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          >
            <Label 
              value={`Average of Both Measurements: (${device1} + ${device2}) / 2`} 
              position="bottom" 
              offset={40}
              style={{ fontSize: '12px', fill: '#6b7280' }}
            />
          </XAxis>
          
          <YAxis 
            type="number" 
            dataKey="difference" 
            name="Difference"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          >
            <Label 
              value={`Difference Between Measurements: ${device1} - ${device2}`} 
              angle={-90} 
              position="left"
              offset={40}
              style={{ fontSize: '12px', fill: '#6b7280', textAnchor: 'middle' }}
            />
          </YAxis>
          
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '8px',
            }}
            formatter={(value: any, name?: string) => {
              if (name === 'average') return [Number(value).toFixed(2), 'Average'];
              if (name === 'difference') return [Number(value).toFixed(2), 'Difference'];
              return [value, name || ''];
            }}
          />
          
          {/* Mean difference line (bias) */}
          <ReferenceLine 
            y={meanDifference} 
            stroke="#2563eb" 
            strokeWidth={2}
            label={{ 
              value: `Mean: ${meanDifference.toFixed(2)} ${unit}`, 
              position: 'right',
              fill: '#2563eb',
              fontSize: 11,
            }}
          />
          
          {/* Upper limit of agreement (+1.96 SD) */}
          <ReferenceLine 
            y={upperLimit} 
            stroke="#dc2626" 
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `+1.96 SD: ${upperLimit.toFixed(2)} ${unit}`, 
              position: 'right',
              fill: '#dc2626',
              fontSize: 11,
            }}
          />
          
          {/* Lower limit of agreement (-1.96 SD) */}
          <ReferenceLine 
            y={lowerLimit} 
            stroke="#dc2626" 
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `-1.96 SD: ${lowerLimit.toFixed(2)} ${unit}`, 
              position: 'right',
              fill: '#dc2626',
              fontSize: 11,
            }}
          />
          
          {/* Data points */}
          <Scatter 
            data={data} 
            fill="#8b5cf6" 
            fillOpacity={0.6}
            shape="circle"
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Interpretation Guide */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h5 className="text-sm font-semibold text-blue-800 mb-2">How to Interpret the Bland-Altman Plot:</h5>
        <div className="text-xs text-blue-700 space-y-2">
          <div>
            <span className="font-semibold">X-axis (Average):</span> The mean of the two measurements. Shows the magnitude of the readings.
          </div>
          <div>
            <span className="font-semibold">Y-axis (Difference):</span> How much {device1} differs from {device2}. Zero means perfect agreement.
          </div>
          <div>
            <span className="font-semibold">Blue horizontal line:</span> Mean difference (bias) between devices. Indicates systematic over/under-estimation.
          </div>
          <div>
            <span className="font-semibold">Red dashed lines:</span> Limits of agreement (±1.96 SD). 95% of points should fall within these limits for good agreement.
          </div>
          <div className="mt-2 pt-2 border-t border-blue-200">
            <span className="font-semibold">Current Results:</span> {percentageInLimits.toFixed(1)}% of measurements fall within limits of agreement.
            {(100 - percentageInLimits) > 5 && (
              <span className="text-red-600 font-medium"> {(100 - percentageInLimits).toFixed(1)}% fall outside limits, indicating potential agreement issues.</span>
            )}
            {(100 - percentageInLimits) <= 5 && (
              <span className="text-green-600 font-medium"> Excellent agreement!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlandAltmanChart;
