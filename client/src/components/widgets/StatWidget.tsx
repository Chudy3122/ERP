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
    blue: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
    green: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
    red: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
    yellow: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
    gray: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
  };

  const iconBgClasses = {
    blue: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    green: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    red: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    yellow: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
    gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };

  return (
    <div
      onClick={onClick}
      className={`p-2 rounded-md border border-gray-200 dark:border-gray-700 ${colorClasses[color]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</div>
        {icon && (
          <div className={`w-7 h-7 rounded-md ${iconBgClasses[color]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
      {trend && (
        <div className={`text-xs mt-0.5 ${trend.isPositive ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
};

export default StatWidget;
