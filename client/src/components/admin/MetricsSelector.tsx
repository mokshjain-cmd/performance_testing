import React from 'react';
import { Activity, Droplet, Wind, Thermometer, ChevronDown } from 'lucide-react';

type Metric = 'hr' | 'spo2' | 'rr' | 'temp';

interface MetricsSelectorProps {
  selectedMetric: Metric;
  onSelectMetric: (metric: Metric) => void;
}

const METRICS = [
  { value: 'hr' as Metric, label: 'Heart Rate', icon: Activity, color: 'text-red-500' },
  { value: 'spo2' as Metric, label: 'SpO₂', icon: Droplet, color: 'text-blue-500' },
  { value: 'rr' as Metric, label: 'Respiratory Rate', icon: Wind, color: 'text-green-500' },
  { value: 'temp' as Metric, label: 'Temperature', icon: Thermometer, color: 'text-orange-500' },
];

const MetricsSelector: React.FC<MetricsSelectorProps> = ({
  selectedMetric,
  onSelectMetric,
}) => {
  const selectedMetricObj = METRICS.find(m => m.value === selectedMetric);
  const SelectedIcon = selectedMetricObj?.icon || Activity;
  
  return (
    <div className="relative inline-block">
      <label className="block text-xs font-medium text-gray-600 mb-1">Metric</label>
      <div className="relative">
        <select
          value={selectedMetric}
          onChange={(e) => onSelectMetric(e.target.value as Metric)}
          className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer min-w-[180px]"
        >
          {METRICS.map((metric) => (
            <option key={metric.value} value={metric.value}>
              {metric.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown size={16} className="text-gray-500" />
        </div>
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <SelectedIcon size={16} className={selectedMetricObj?.color || 'text-gray-500'} />
        </div>
        <style>{`
          select {
            padding-left: 2.5rem;
          }
        `}</style>
      </div>
    </div>
  );
};

export default MetricsSelector;
export type { Metric };
