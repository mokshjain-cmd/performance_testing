import React from 'react';
import { Activity, Droplet, Wind, Thermometer } from 'lucide-react';

type Metric = 'hr' | 'spo2' | 'rr' | 'temp';

interface MetricsSelectorProps {
  selectedMetric: Metric;
  onSelectMetric: (metric: Metric) => void;
}

const METRICS = [
  { value: 'hr' as Metric, label: 'Heart Rate', icon: Activity, color: 'text-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-500' },
  { value: 'spo2' as Metric, label: 'SpO₂', icon: Droplet, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-500' },
  { value: 'rr' as Metric, label: 'Respiratory Rate', icon: Wind, color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-500' },
  { value: 'temp' as Metric, label: 'Temperature', icon: Thermometer, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-500' },
];

const MetricsSelector: React.FC<MetricsSelectorProps> = ({
  selectedMetric,
  onSelectMetric,
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-700">Select Metric:</span>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          const isSelected = selectedMetric === metric.value;
          
          return (
            <button
              key={metric.value}
              onClick={() => onSelectMetric(metric.value)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                border-2
                ${isSelected 
                  ? `${metric.bgColor} ${metric.borderColor} shadow-md scale-105` 
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              <Icon 
                size={20} 
                className={isSelected ? metric.color : 'text-gray-400'}
              />
              <span className={`text-sm font-medium ${isSelected ? metric.color : 'text-gray-600'}`}>
                {metric.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MetricsSelector;
export type { Metric };
