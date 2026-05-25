import React from 'react';
import { Loader2 } from 'lucide-react';

interface DashboardWidgetLoadingProps {
  label: string;
  className?: string;
}

interface DashboardWidgetEmptyProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const DashboardWidgetLoading = ({
  label,
  className = 'min-h-[140px]',
}: DashboardWidgetLoadingProps) => (
  <div className={`flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>{label}</span>
  </div>
);

export const DashboardWidgetEmpty = ({
  icon,
  title,
  description,
  action,
  className = 'min-h-[140px]',
}: DashboardWidgetEmptyProps) => (
  <div className={`flex flex-col items-center justify-center text-center ${className}`}>
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
      {icon}
    </div>
    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
    {description && (
      <p className="mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">{description}</p>
    )}
    {action && <div className="mt-3 w-full">{action}</div>}
  </div>
);
