import React from 'react';

interface StatWidgetProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray';
  onClick?: () => void;
}

const StatWidget: React.FC<StatWidgetProps> = ({ label, value, icon, trend, color = 'blue', onClick }) => {
  const colorClasses = {
    blue: 'bg-white text-gray-900',
    green: 'bg-white text-gray-900',
    red: 'bg-white text-gray-900',
    yellow: 'bg-white text-gray-900',
    gray: 'bg-white text-gray-900',
  };

  const iconBgClasses = {
    blue: 'bg-gray-100 text-gray-600',
    green: 'bg-gray-100 text-gray-600',
    red: 'bg-gray-100 text-gray-600',
    yellow: 'bg-gray-100 text-gray-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-md border border-gray-200 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-gray-600">{label}</div>
        {icon && (
          <div className={`w-8 h-8 rounded-md ${iconBgClasses[color]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${trend.isPositive ? 'text-gray-600' : 'text-gray-600'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
};

export default StatWidget;
