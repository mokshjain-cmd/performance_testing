import React from 'react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showValue?: boolean;
  unit?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 120,
  strokeWidth = 10,
  color = '#3b82f6',
  label = '',
  showValue = true,
  unit = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, (value / max) * 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold" style={{ color }}>
              {Math.round(value)}
              {unit && <span className="text-lg">{unit}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              of {max}
            </div>
          </div>
        )}
      </div>
      {label && (
        <div className="text-sm font-medium text-gray-700">{label}</div>
      )}
    </div>
  );
};
