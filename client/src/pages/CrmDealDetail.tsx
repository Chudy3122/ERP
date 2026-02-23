import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  ArrowLeft,
  Trash2,
  PhoneCall,
  Mail,
  Calendar,
  MessageSquare,
  CheckCircle,
  Circle,
  Trophy,
  XCircle,
  Plus,
  FileText,
  User,
  Building2,
  DollarSign,
  Clock,
} from 'lucide-react';
import * as crmApi from '../api/crm.api';
import {
  CrmDeal,
  CrmDealActivity,
  DealStatus,
  DealActivityType,
  DEAL_STATUS_LABELS,
  DEAL_PRIORITY_LABELS,
  DEAL_PRIORITY_COLORS,
  ACTIVITY_TYPE_LABELS,
  CreateActivityRequest,
} from '../types/crm.types';

const ACTIVITY_ICONS: Record<DealActivityType, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  [DealActivityType.NOTE]: MessageSquare,
  [DealActivityType.CALL]: PhoneCall,
  [DealActivityType.MEETING]: Calendar,
  [DealActivityType.EMAIL]: Mail,
  [DealActivityType.TASK]: CheckCircle,
  [DealActivityType.STAGE_CHANGE]: Circle,
  [DealActivityType.STATUS_CHANGE]: Circle,
};

const ACTIVITY_COLORS: Record<DealActivityType, string> = {
  [DealActivityType.NOTE]: '#6B7280',
  [DealActivityType.CALL]: '#3B82F6',
  [DealActivityType.MEETING]: '#8B5CF6',
  [DealActivityType.EMAIL]: '#F59E0B',
  [DealActivityType.TASK]: '#10B981',
  [DealActivityType.STAGE_CHANGE]: '#6B7280',
  [DealActivityType.STATUS_CHANGE]: '#6B7280',
};

const formatCurrency = (value: number, currency = 'PLN') =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value);

const CrmDealDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<CrmDeal | null>(null);
  const [activities, setActivities] = useState<CrmDealActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activityForm, setActivityForm] = useState<CreateActivityRequest>({
    type: DealActivityType.NOTE,
    title: '',
  });
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [showLostForm, setShowLostForm] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (id) loadDeal();
  }, [id]);

  const loadDeal = async () => {
    try {
      setIsLoading(true);
      const [dealData, activitiesData] = await Promise.all([
        crmApi.getDealById(id!),
        crmApi.getDealActivities(id!),
      ]);
      setDeal(dealData);
      setActivities(activitiesData);
    } catch (err) {
      console.error('Failed to load deal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;

    setIsSavingActivity(true);
    try {
      const newActivity = await crmApi.createDealActivity(id!, activityForm);
      setActivities(prev => [newActivity, ...prev]);
      setActivityForm({ type: DealActivityType.NOTE, title: '' });
      setShowActivityForm(false);
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setIsSavingActivity(false);
    }
  };

  const handleMarkWon = async () => {
    if (!deal || !window.confirm('Oznaczyć deal jako wygrany?')) return;
    try {
      const updated = await crmApi.updateDealStatus(deal.id, DealStatus.WON);
      setDeal(updated);
      await loadDeal();
    } catch (err) {
      console.error('Failed to mark won:', err);
    }
  };

  const handleMarkLost = async () => {
    if (!deal) return;
    try {
      const updated = await crmApi.updateDealStatus(deal.id, DealStatus.LOST, lostReason || undefined);
      setDeal(updated);
      setShowLostForm(false);
      await loadDeal();
    } catch (err) {
      console.error('Failed to mark lost:', err);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!deal || !window.confirm('Wygenerować fakturę dla tego deala?')) return;
    setIsConverting(true);
    try {
      const invoice = await crmApi.convertDealToInvoice(deal.id);
      navigate(`/invoices/${invoice.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się wygenerować faktury');
      setIsConverting(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!deal || !window.confirm('Na pewno usunąć tego deala?')) return;
    try {
      await crmApi.deleteDeal(deal.id);
      navigate('/crm');
    } catch (err) {
      console.error('Failed to delete deal:', err);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const updated = await crmApi.completeActivity(activityId);
      setActivities(prev => prev.map(a => a.id === activityId ? updated : a));
    } catch (err) {
      console.error('Failed to complete activity:', err);
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Deal">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-800" />
        </div>
      </MainLayout>
    );
  }

  if (!deal) {
    return (
      <MainLayout title="Deal">
        <div className="text-center py-12 text-gray-500">Deal nie znaleziony</div>
      </MainLayout>
    );
  }

  const statusColors: Record<DealStatus, string> = {
    [DealStatus.OPEN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    [DealStatus.WON]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    [DealStatus.LOST]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <MainLayout title={deal.title}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/crm')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{deal.title}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[deal.status]}`}>
              {DEAL_STATUS_LABELS[deal.status]}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: DEAL_PRIORITY_COLORS[deal.priority] }}
            >
              {DEAL_PRIORITY_LABELS[deal.priority]}
            </span>
          </div>
          {deal.stage && (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: deal.stage.color }} />
              <span className="text-sm text-gray-500">{deal.pipeline?.name} → {deal.stage.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {deal.status === DealStatus.OPEN && (
            <>
              <button
                onClick={handleMarkWon}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm transition-colors"
              >
                <Trophy className="w-4 h-4" /> Wygrana
              </button>
              <button
                onClick={() => setShowLostForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" /> Przegrana
              </button>
            </>
          )}
          {deal.status === DealStatus.WON && !deal.won_invoice_id && (
            <button
              onClick={handleConvertToInvoice}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-sm transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {isConverting ? 'Generowanie...' : 'Generuj fakturę'}
            </button>
          )}
          {deal.won_invoice_id && (
            <button
              onClick={() => navigate(`/invoices/${deal.won_invoice_id}`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm transition-colors"
            >
              <FileText className="w-4 h-4" /> Otwórz fakturę
            </button>
          )}
          <button
            onClick={handleDeleteDeal}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Deal details */}
        <div className="space-y-4">
          {/* Value card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Wartość</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(Number(deal.value), deal.currency)}
            </p>
            {deal.expected_close_date && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>Planowane zamknięcie: {new Date(deal.expected_close_date).toLocaleDateString('pl-PL')}</span>
              </div>
            )}
            {deal.actual_close_date && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Zamknięto: {new Date(deal.actual_close_date).toLocaleDateString('pl-PL')}</span>
              </div>
            )}
          </div>

          {/* Client & Contact */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Kontrahent</h3>
            </div>
            {deal.client ? (
              <button
                onClick={() => navigate(`/clients/${deal.client_id}`)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {deal.client.name}
              </button>
            ) : (
              <p className="text-sm text-gray-400">Brak kontrahenta</p>
            )}
            {(deal.contact_person || deal.contact_email || deal.contact_phone) && (
              <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                {deal.contact_person && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5" />
                    {deal.contact_person}
                  </div>
                )}
                {deal.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <a href={`mailto:${deal.contact_email}`} className="text-blue-600 hover:underline">{deal.contact_email}</a>
                  </div>
                )}
                {deal.contact_phone && (
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <a href={`tel:${deal.contact_phone}`} className="text-blue-600 hover:underline">{deal.contact_phone}</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Odpowiedzialny</h3>
            </div>
            {deal.assignee ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-bold">
                  {deal.assignee.first_name[0]}{deal.assignee.last_name[0]}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {deal.assignee.first_name} {deal.assignee.last_name}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Nieprzypisany</p>
            )}
          </div>

          {/* Description */}
          {deal.description && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Opis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{deal.description}</p>
            </div>
          )}

          {/* Lost reason */}
          {deal.status === DealStatus.LOST && deal.lost_reason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-4">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Powód przegranej</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{deal.lost_reason}</p>
            </div>
          )}
        </div>

        {/* Right - Activity timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Aktywności</h3>
              <button
                onClick={() => setShowActivityForm(!showActivityForm)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Dodaj
              </button>
            </div>

            {/* Add activity form */}
            {showActivityForm && (
              <form onSubmit={handleAddActivity} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Typ</label>
                    <select
                      value={activityForm.type}
                      onChange={e => setActivityForm(prev => ({ ...prev, type: e.target.value as DealActivityType }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      {Object.entries(ACTIVITY_TYPE_LABELS)
                        .filter(([val]) => !['stage_change', 'status_change'].includes(val))
                        .map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Zaplanowane na</label>
                    <input
                      type="datetime-local"
                      value={activityForm.scheduled_at || ''}
                      onChange={e => setActivityForm(prev => ({ ...prev, scheduled_at: e.target.value || undefined }))}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <input
                    value={activityForm.title}
                    onChange={e => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Tytuł aktywności..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>
                <div className="mb-3">
                  <textarea
                    value={activityForm.description || ''}
                    onChange={e => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Notatki..."
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowActivityForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Anuluj</button>
                  <button type="submit" disabled={isSavingActivity} className="text-sm px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors disabled:opacity-50">
                    Zapisz
                  </button>
                </div>
              </form>
            )}

            {/* Timeline */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">Brak aktywności</div>
              ) : (
                activities.map(activity => {
                  const Icon = ACTIVITY_ICONS[activity.type] || Circle;
                  const color = ACTIVITY_COLORS[activity.type] || '#6B7280';
                  const isSystem = [DealActivityType.STAGE_CHANGE, DealActivityType.STATUS_CHANGE].includes(activity.type);

                  return (
                    <div key={activity.id} className="flex gap-3 p-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`text-sm ${isSystem ? 'text-gray-500 italic' : 'font-medium text-gray-900 dark:text-white'}`}>
                              {activity.title}
                            </span>
                            {activity.description && (
                              <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                            )}
                            {activity.scheduled_at && !activity.is_completed && (
                              <p className="text-xs text-amber-600 mt-0.5">
                                Zaplanowane: {new Date(activity.scheduled_at).toLocaleString('pl-PL')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">
                              {new Date(activity.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                            {activity.type === DealActivityType.TASK && !activity.is_completed && (
                              <button
                                onClick={() => handleCompleteActivity(activity.id)}
                                className="text-xs text-green-600 hover:text-green-700 px-2 py-0.5 border border-green-300 rounded hover:bg-green-50"
                              >
                                Zakończ
                              </button>
                            )}
                          </div>
                        </div>
                        {activity.creator && !isSystem && (
                          <p className="text-xs text-gray-400 mt-1">
                            {activity.creator.first_name} {activity.creator.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lost reason modal */}
      {showLostForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-sm p-5 shadow-xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3">Powód przegranej (opcjonalnie)</h3>
            <textarea
              value={lostReason}
              onChange={e => setLostReason(e.target.value)}
              placeholder="np. cena, konkurencja, brak budżetu..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowLostForm(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Anuluj</button>
              <button onClick={handleMarkLost} className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md">Oznacz jako przegraną</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default CrmDealDetail;
