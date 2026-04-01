import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-blue-500',
  children,
  className = ''
}) => {
  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 overflow-hidden transition-all duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.08)] ${className}`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100/50">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className={`${iconColor}`} size={22} />}
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
};
