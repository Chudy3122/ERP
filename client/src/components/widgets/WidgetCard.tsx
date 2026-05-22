import React from 'react';

interface WidgetCardProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const WidgetCard: React.FC<WidgetCardProps> = ({ title, icon, actions, children, className = '' }) => {
  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </div>
  );
};

export default WidgetCard;
