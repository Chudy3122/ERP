import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import MainLayout from '../components/layout/MainLayout';
import KanbanColumn from '../components/crm/KanbanColumn';
import CreateDealModal from '../components/crm/CreateDealModal';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Target,
} from 'lucide-react';
import * as crmApi from '../api/crm.api';
import {
  CrmPipeline,
  CrmPipelineStage,
  CrmDeal,
  CreateDealRequest,
  DealStatus,
  DealFilters,
  DEAL_STATUS_LABELS,
} from '../types/crm.types';

const CrmBoard = () => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState<CrmPipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<CrmPipeline | null>(null);
  const [dealsByStage, setDealsByStage] = useState<Record<string, CrmDeal[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [defaultStage, setDefaultStage] = useState<CrmPipelineStage | undefined>(undefined);
  const [showPipelineMenu, setShowPipelineMenu] = useState(false);
  const [filters, setFilters] = useState<DealFilters>({ status: DealStatus.OPEN });
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPipelineForm, setShowNewPipelineForm] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadDeals();
    }
  }, [selectedPipeline, filters]);

  const loadPipelines = async () => {
    try {
      const data = await crmApi.getAllPipelines();
      setPipelines(data);
      if (data.length > 0) {
        const fullPipeline = await crmApi.getPipelineById(data[0].id);
        setSelectedPipeline(fullPipeline);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
      setIsLoading(false);
    }
  };

  const loadDeals = useCallback(async () => {
    if (!selectedPipeline) return;
    try {
      setIsLoading(true);
      const searchFilter = searchQuery ? { ...filters, search: searchQuery } : filters;
      const data = await crmApi.getDealsByPipeline(selectedPipeline.id, searchFilter);
      setDealsByStage(data);
    } catch (err) {
      console.error('Failed to load deals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPipeline, filters, searchQuery]);

  useEffect(() => {
    if (!selectedPipeline) return;
    const delay = setTimeout(loadDeals, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const selectPipeline = async (pipeline: CrmPipeline) => {
    setShowPipelineMenu(false);
    try {
      const full = await crmApi.getPipelineById(pipeline.id);
      setSelectedPipeline(full);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !selectedPipeline) return;

    const sourceStageId = result.source.droppableId;
    const destStageId = result.destination.droppableId;
    const dealId = result.draggableId;

    if (sourceStageId === destStageId && result.source.index === result.destination.index) return;

    // Optimistic update
    const newDealsByStage = { ...dealsByStage };
    const sourceDeals = [...(newDealsByStage[sourceStageId] || [])];
    const [movedDeal] = sourceDeals.splice(result.source.index, 1);

    if (!movedDeal) return;

    const destDeals = sourceStageId === destStageId
      ? sourceDeals
      : [...(newDealsByStage[destStageId] || [])];
    destDeals.splice(result.destination.index, 0, { ...movedDeal, stage_id: destStageId });

    newDealsByStage[sourceStageId] = sourceDeals;
    newDealsByStage[destStageId] = destDeals;
    setDealsByStage(newDealsByStage);

    try {
      await crmApi.moveDeal(dealId, {
        stage_id: destStageId,
        position: result.destination.index,
      });
      // Reload to get server-side status updates (e.g. won/lost)
      await loadDeals();
    } catch (err) {
      console.error('Failed to move deal:', err);
      await loadDeals(); // Revert on error
    }
  };

  const handleCreateDeal = async (data: CreateDealRequest) => {
    await crmApi.createDeal(data);
    await loadDeals();
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    try {
      const pipeline = await crmApi.createPipeline({ name: newPipelineName });
      setPipelines(prev => [...prev, pipeline]);
      setNewPipelineName('');
      setShowNewPipelineForm(false);
      const full = await crmApi.getPipelineById(pipeline.id);
      setSelectedPipeline(full);
    } catch (err) {
      console.error('Failed to create pipeline:', err);
    }
  };

  const openAddDeal = (stage: CrmPipelineStage) => {
    setDefaultStage(stage);
    setShowCreateDeal(true);
  };

  const sortedStages = selectedPipeline
    ? [...(selectedPipeline.stages || [])].filter(s => s.is_active).sort((a, b) => a.position - b.position)
    : [];

  const totalOpenValue = Object.values(dealsByStage).flat()
    .filter(d => d.status === DealStatus.OPEN)
    .reduce((sum, d) => sum + Number(d.value), 0);

  const totalDeals = Object.values(dealsByStage).flat().length;

  return (
    <MainLayout title="CRM">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Pipeline selector */}
          <div className="relative">
            <button
              onClick={() => setShowPipelineMenu(!showPipelineMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-900 dark:text-white"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedPipeline?.color || '#3B82F6' }} />
              {selectedPipeline?.name || 'Wybierz pipeline'}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showPipelineMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-30 overflow-hidden">
                {pipelines.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPipeline(p)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${p.id === selectedPipeline?.id ? 'bg-gray-50 dark:bg-gray-700 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  {showNewPipelineForm ? (
                    <div className="flex gap-1">
                      <input
                        value={newPipelineName}
                        onChange={e => setNewPipelineName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreatePipeline()}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                        placeholder="Nazwa pipeline"
                        autoFocus
                      />
                      <button onClick={handleCreatePipeline} className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-900">OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewPipelineForm(true)}
                      className="w-full flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nowy pipeline
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          {selectedPipeline && (
            <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{totalDeals} deali</span>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>{totalOpenValue.toLocaleString('pl-PL')} PLN</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Szukaj..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-40 focus:ring-2 focus:ring-gray-400"
            />
          </div>

          {/* Status filter */}
          <select
            value={filters.status || ''}
            onChange={e => setFilters(prev => ({ ...prev, status: e.target.value as DealStatus || undefined }))}
            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 focus:ring-2 focus:ring-gray-400"
          >
            <option value="">Wszystkie</option>
            {Object.entries(DEAL_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* CRM Dashboard link */}
          <button
            onClick={() => navigate('/crm/dashboard')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Dashboard
          </button>

          {/* Add deal */}
          {selectedPipeline && (
            <button
              onClick={() => { setDefaultStage(sortedStages[0]); setShowCreateDeal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nowy deal
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {!selectedPipeline ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Brak pipeline</h3>
          <p className="text-gray-500 mb-4">Utwórz pierwszy pipeline CRM, aby zarządzać dealami</p>
          <button
            onClick={() => { setShowPipelineMenu(true); setShowNewPipelineForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Utwórz pipeline
          </button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-gray-800" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {sortedStages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                onAddDeal={openAddDeal}
                onDealClick={deal => navigate(`/crm/deals/${deal.id}`)}
              />
            ))}

            {/* Add stage placeholder */}
            <div className="flex-shrink-0 w-56 flex items-start justify-center pt-2">
              <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 transition-colors">
                <Plus className="w-4 h-4" /> Dodaj etap
              </button>
            </div>
          </div>
        </DragDropContext>
      )}

      {/* Create deal modal */}
      {showCreateDeal && selectedPipeline && (
        <CreateDealModal
          pipeline={selectedPipeline}
          defaultStage={defaultStage}
          onClose={() => setShowCreateDeal(false)}
          onSave={handleCreateDeal}
        />
      )}

      {/* Overlay for pipeline menu */}
      {showPipelineMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowPipelineMenu(false)} />
      )}
    </MainLayout>
  );
};

export default CrmBoard;
