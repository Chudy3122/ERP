import { Droppable } from '@hello-pangea/dnd';
import { CrmDeal, CrmPipelineStage } from '../../types/crm.types';
import DealCard from './DealCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: CrmPipelineStage;
  deals: CrmDeal[];
  onAddDeal: (stage: CrmPipelineStage) => void;
  onDealClick: (deal: CrmDeal) => void;
}

const formatColumnValue = (deals: CrmDeal[]) => {
  const total = deals.reduce((sum, d) => sum + Number(d.value), 0);
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M PLN`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(0)}K PLN`;
  return `${total} PLN`;
};

const KanbanColumn = ({ stage, deals, onAddDeal, onDealClick }: KanbanColumnProps) => {
  return (
    <div className="flex-shrink-0 w-64 flex flex-col bg-gray-100 dark:bg-gray-800/60 rounded-lg overflow-hidden">
      {/* Column header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{stage.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5 flex-shrink-0">
            {deals.length}
          </span>
        </div>
        <button
          onClick={() => onAddDeal(stage)}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Total value */}
      {deals.length > 0 && (
        <div className="px-3 pb-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {formatColumnValue(deals)}
          </span>
        </div>
      )}

      {/* Droppable area */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-2 pb-2 space-y-2 min-h-[100px] overflow-y-auto max-h-[calc(100vh-320px)] transition-colors
              ${snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                onClick={onDealClick}
              />
            ))}
            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <div className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                Przeciągnij tutaj lub kliknij +
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
