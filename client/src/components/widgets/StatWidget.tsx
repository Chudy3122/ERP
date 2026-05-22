import React from 'react';

interface StatWidgetProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
  onClick?: () => void;
}

const StatWidget: React.FC<StatWidgetProps> = ({ label, value, icon, trend, color = 'blue', onClick }) => {
  const iconBgClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300',
    yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:hover:border-gray-600' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {label}
          </div>
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBgClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="truncate text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {trend && (
        <div className={`mt-2 text-xs font-medium ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend.isPositive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  );
};

export default StatWidget;
