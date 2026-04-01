import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: 'red' | 'purple' | 'blue' | 'green' | 'orange' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    label?: string;
  };
}

const colorClasses = {
  red: 'bg-red-50 border-red-200 text-red-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  green: 'bg-green-50 border-green-200 text-green-900',
  orange: 'bg-orange-50 border-orange-200 text-orange-900',
  gray: 'bg-gray-50 border-gray-200 text-gray-900'
};

const sizeClasses = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4'
};

const valueSize = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl'
};

const labelSize = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base'
};

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  unit = '',
  color = 'gray',
  size = 'md',
  icon,
  trend
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    const iconClass = trend.direction === 'up' ? 'text-green-600' : 
                      trend.direction === 'down' ? 'text-red-600' : 
                      'text-gray-400';
    
    const Icon = trend.direction === 'up' ? TrendingUp : 
                 trend.direction === 'down' ? TrendingDown : 
                 Minus;
    
    return (
      <div className={`flex items-center gap-1 ${iconClass} text-xs font-medium`}>
        <Icon size={14} />
        <span>{Math.abs(trend.value)}%</span>
        {trend.label && <span className="text-gray-500">vs {trend.label}</span>}
      </div>
    );
  };

  return (
    <div className={`rounded-lg border ${colorClasses[color]} ${sizeClasses[size]} transition-all duration-200 hover:shadow-md`}>
      <div className="space-y-1">
        {/* Label */}
        <div className="flex items-center gap-2">
          {icon && <div className="opacity-70">{icon}</div>}
          <div className={`${labelSize[size]} font-medium uppercase tracking-wide opacity-70`}>
            {label}
          </div>
        </div>
        
        {/* Value */}
        <div className="flex items-baseline gap-1">
          <div className={`${valueSize[size]} font-bold`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          {unit && (
            <div className={`${labelSize[size]} opacity-70 font-medium`}>
              {unit}
            </div>
          )}
        </div>
        
        {/* Trend */}
        {trend && (
          <div className="pt-1 border-t border-current border-opacity-10">
            {getTrendIcon()}
          </div>
        )}
      </div>
    </div>
  );
};
