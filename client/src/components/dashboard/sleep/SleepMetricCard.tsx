import React from 'react';
import Card from '../../common/Card';

interface SleepMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export const SleepMetricCard: React.FC<SleepMetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  trend,
  icon,
}) => {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{value}</span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div
              className={`text-xs mt-2 ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span> {Math.abs(trend.value)}%
              from avg
            </div>
          )}
        </div>
        {icon && <div className="text-blue-500">{icon}</div>}
      </div>
    </Card>
  );
};
