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
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-600 dark:text-gray-400">{icon}</div>}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      <div className="p-2 flex-1 min-h-0 flex flex-col">{children}</div>
    </div>
  );
};

export default WidgetCard;
