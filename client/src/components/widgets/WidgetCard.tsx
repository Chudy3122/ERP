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
    <div className={`bg-white border border-gray-200 rounded-md shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-600">{icon}</div>}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Content */}
      <div className="p-2">{children}</div>
    </div>
  );
};

export default WidgetCard;
