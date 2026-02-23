import { Draggable } from '@hello-pangea/dnd';
import { CrmDeal, DEAL_PRIORITY_COLORS } from '../../types/crm.types';
import { Calendar, User, DollarSign, AlertTriangle } from 'lucide-react';

interface DealCardProps {
  deal: CrmDeal;
  index: number;
  onClick: (deal: CrmDeal) => void;
}

const formatCurrency = (value: number, currency: string = 'PLN') => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M ${currency}`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K ${currency}`;
  return `${value} ${currency}`;
};

const isOverdue = (dateStr?: string) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
};

const DealCard = ({ deal, index, onClick }: DealCardProps) => {
  const overdue = isOverdue(deal.expected_close_date);

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(deal)}
          className={`bg-white dark:bg-gray-700 rounded-lg border p-3 cursor-pointer transition-all select-none
            ${snapshot.isDragging
              ? 'border-blue-400 shadow-lg rotate-1 scale-105'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm'
            }`}
        >
          {/* Priority indicator */}
          <div
            className="w-full h-0.5 rounded-full mb-2"
            style={{ backgroundColor: DEAL_PRIORITY_COLORS[deal.priority] || '#6B7280' }}
          />

          {/* Title */}
          <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
            {deal.title}
          </h4>

          {/* Client */}
          {deal.client && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
              {deal.client.name}
            </p>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between mt-2 gap-1">
            {/* Value */}
            <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
              <DollarSign className="w-3 h-3 text-green-500 flex-shrink-0" />
              {formatCurrency(Number(deal.value), deal.currency)}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Due date */}
              {deal.expected_close_date && (
                <div className={`flex items-center gap-0.5 text-xs ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                  {overdue && <AlertTriangle className="w-3 h-3" />}
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(deal.expected_close_date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</span>
                </div>
              )}

              {/* Assignee avatar */}
              {deal.assignee ? (
                <div
                  className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  title={`${deal.assignee.first_name} ${deal.assignee.last_name}`}
                >
                  {deal.assignee.first_name[0]}{deal.assignee.last_name[0]}
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-2.5 h-2.5 text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default DealCard;
