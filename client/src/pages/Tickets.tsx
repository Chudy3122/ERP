import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import {
  AlertCircle,
  Archive,
  Bug,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  HelpCircle,
  Inbox,
  LifeBuoy,
  Lightbulb,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  XCircle,
} from 'lucide-react';
import * as ticketApi from '../api/ticket.api';
import { Ticket, TicketPriority, TicketStatus, TicketType } from '../types/ticket.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'rejected' | 'closed';
type ViewTab = 'my' | 'assigned' | 'all';

const PAGE_SIZE_OPTIONS = [10, 30, 50];

const Tickets = () => {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TicketType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'kierownik';
  const requestedTab = searchParams.get('tab') as ViewTab | null;
  const activeTab: ViewTab =
    requestedTab === 'assigned' || requestedTab === 'my' || (requestedTab === 'all' && isAdmin)
      ? requestedTab
      : isAdmin
        ? 'all'
        : 'my';

  useEffect(() => {
    loadTickets();
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenStatusDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      let data: Ticket[] = [];

      if (activeTab === 'my') {
        data = await ticketApi.getMyTickets();
      } else if (activeTab === 'assigned') {
        data = await ticketApi.getAssignedTickets();
      } else {
        const result = await ticketApi.getTickets();
        data = result.tickets;
      }

      setTickets(data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTab = (tab: ViewTab) => {
    setSearchParams({ tab });
    setCurrentPage(1);
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      setChangingStatus(ticketId);
      await ticketApi.updateTicketStatus(ticketId, newStatus);
      setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket)));
      setOpenStatusDropdown(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setChangingStatus(null);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          ticket.title.toLowerCase().includes(query) ||
          ticket.ticket_number.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (typeFilter !== 'all' && ticket.type !== typeFilter) return false;

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, typeFilter]);

  const ticketStats = useMemo(() => {
    const stats = {
      total: tickets.length,
      open: 0,
      in_progress: 0,
      waiting_response: 0,
      resolved: 0,
      rejected: 0,
      closed: 0,
    };

    tickets.forEach((ticket) => {
      if (ticket.status in stats) {
        stats[ticket.status as keyof Omit<typeof stats, 'total'>]++;
      }
    });

    return stats;
  }, [tickets]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = filteredTickets.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredTickets.length);
  const paginatedTickets = filteredTickets.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const getStatusConfig = (status: TicketStatus) => {
    const configs: Record<TicketStatus, { label: string; color: string; icon: typeof Inbox; dotColor: string }> = {
      open: {
        label: t('tickets:statusOpen'),
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        icon: Inbox,
        dotColor: 'bg-blue-500',
      },
      in_progress: {
        label: t('tickets:statusInProgress'),
        color: 'bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300',
        icon: PlayCircle,
        dotColor: 'bg-[#F7941D]',
      },
      waiting_response: {
        label: t('tickets:statusWaiting'),
        color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        icon: PauseCircle,
        dotColor: 'bg-purple-500',
      },
      resolved: {
        label: t('tickets:statusResolved'),
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        icon: CheckCircle2,
        dotColor: 'bg-emerald-500',
      },
      rejected: {
        label: t('tickets:statusRejected'),
        color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        icon: XCircle,
        dotColor: 'bg-red-500',
      },
      closed: {
        label: t('tickets:statusClosed'),
        color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        icon: Archive,
        dotColor: 'bg-gray-400',
      },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TicketPriority) => {
    const configs = {
      low: { label: t('tickets:priorityLow'), color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-700' },
      normal: { label: t('tickets:priorityNormal'), color: 'text-blue-600 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/30' },
      high: { label: t('tickets:priorityHigh'), color: 'text-[#F7941D] dark:text-orange-300', bgColor: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15' },
      urgent: { label: t('tickets:priorityUrgent'), color: 'text-red-600 dark:text-red-300', bgColor: 'bg-red-50 dark:bg-red-900/30' },
    };
    return configs[priority];
  };

  const getTypeConfig = (type: TicketType) => {
    const configs = {
      bug: { label: t('tickets:typeBug'), icon: Bug, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
      feature_request: { label: t('tickets:typeFeature'), icon: Lightbulb, color: 'text-[#F7941D]', bg: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15' },
      support: { label: t('tickets:typeSupport'), icon: LifeBuoy, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
      question: { label: t('tickets:typeQuestion'), icon: HelpCircle, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      other: { label: t('tickets:typeOther'), icon: MoreHorizontal, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' },
    };
    return configs[type];
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('tickets:current') + ', ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return t('tickets:total') + ', ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays < 7) {
      return `${diffDays} dni temu`;
    }
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '';

  const allStatuses: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.REJECTED,
    TicketStatus.CLOSED,
  ];

  const statCards = [
    { key: 'all', label: t('tickets:all'), value: ticketStats.total, filter: 'all' as StatusFilter, icon: AlertCircle, accent: 'text-[#F7941D]', bg: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15' },
    { key: 'open', label: t('tickets:statusOpen'), value: ticketStats.open, filter: 'open' as StatusFilter, icon: Inbox, accent: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/30' },
    { key: 'in_progress', label: t('tickets:statusInProgress'), value: ticketStats.in_progress, filter: 'in_progress' as StatusFilter, icon: PlayCircle, accent: 'text-[#F7941D] dark:text-orange-300', bg: 'bg-[#F7941D]/10 dark:bg-[#F7941D]/15' },
    { key: 'resolved', label: t('tickets:statusResolved'), value: ticketStats.resolved, filter: 'resolved' as StatusFilter, icon: CheckCircle2, accent: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
    { key: 'rejected', label: t('tickets:statusRejected'), value: ticketStats.rejected, filter: 'rejected' as StatusFilter, icon: XCircle, accent: 'text-red-600 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/30' },
    { key: 'closed', label: t('tickets:statusClosed'), value: ticketStats.closed, filter: 'closed' as StatusFilter, icon: Archive, accent: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-700' },
  ];

  const tabs = [
    ...(isAdmin ? [{ key: 'all' as ViewTab, label: t('tickets:all') }] : []),
    { key: 'my' as ViewTab, label: t('tickets:myTickets') },
    { key: 'assigned' as ViewTab, label: t('tickets:assigned') },
  ];

  return (
    <MainLayout title="Zgłoszenia">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941D]">Obsługa spraw</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                  <LifeBuoy className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-950 dark:text-white">Zgłoszenia</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('tickets:subtitle')}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/tickets/new')}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#F7941D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#e08317] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/40"
            >
              <Plus className="h-4 w-4" />
              {t('tickets:newTicket')}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            const isActive = statusFilter === card.filter;

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setStatusFilter(card.filter);
                  setCurrentPage(1);
                }}
                className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-800 ${
                  isActive
                    ? 'border-[#F7941D] ring-2 ring-[#F7941D]/20 dark:border-[#F7941D]'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg} ${card.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-950 dark:text-white">{card.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-gray-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#F7941D] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('tickets:search')}
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors ${
                  hasActiveFilters
                    ? 'border-[#F7941D] bg-[#F7941D] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                {t('tickets:filters')}
                {hasActiveFilters && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-semibold text-white">
                    {[statusFilter !== 'all', priorityFilter !== 'all', typeFilter !== 'all'].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">{t('tickets:priority')}:</label>
                <select
                  value={priorityFilter}
                  onChange={(event) => {
                    setPriorityFilter(event.target.value as TicketPriority | 'all');
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('tickets:all')}</option>
                  <option value="low">{t('tickets:priorityLow')}</option>
                  <option value="normal">{t('tickets:priorityNormal')}</option>
                  <option value="high">{t('tickets:priorityHigh')}</option>
                  <option value="urgent">{t('tickets:priorityUrgent')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-300">{t('tickets:type')}:</label>
                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as TicketType | 'all');
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">{t('tickets:all')}</option>
                  <option value="bug">{t('tickets:typeBug')}</option>
                  <option value="feature_request">{t('tickets:typeFeature')}</option>
                  <option value="support">{t('tickets:typeSupport')}</option>
                  <option value="question">{t('tickets:typeQuestion')}</option>
                  <option value="other">{t('tickets:typeOther')}</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-semibold text-[#F7941D] hover:text-[#e08317]"
                >
                  {t('tickets:clearFilters')}
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center">
              <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#F7941D]" />
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('tickets:loading')}</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F7941D]/10 text-[#F7941D] dark:bg-[#F7941D]/15 dark:text-orange-300">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-950 dark:text-white">
                {hasActiveFilters ? t('tickets:noResults') : t('tickets:noTickets')}
              </h3>
              <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                {hasActiveFilters ? t('tickets:noTicketsFiltered') : t('tickets:noTicketsCategory')}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {t('tickets:clearFilters')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/tickets/new')}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e08317]"
                >
                  <Plus className="h-4 w-4" />
                  {t('tickets:createTicket')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {paginatedTickets.map((ticket) => {
                  const statusConfig = getStatusConfig(ticket.status);
                  const priorityConfig = getPriorityConfig(ticket.priority);
                  const typeConfig = getTypeConfig(ticket.type);
                  const StatusIcon = statusConfig.icon;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <article
                      key={ticket.id}
                      className="group p-4 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          className={`mt-0.5 rounded-xl p-2.5 ${typeConfig.bg} ${typeConfig.color}`}
                          onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                          aria-label="Otwórz zgłoszenie"
                        >
                          <TypeIcon className="h-5 w-5" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <button
                              type="button"
                              className="min-w-0 text-left"
                              onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-gray-400">{ticket.ticket_number}</span>
                                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${priorityConfig.bgColor} ${priorityConfig.color}`}>
                                  {priorityConfig.label}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{typeConfig.label}</span>
                              </div>
                              <h3 className="truncate font-semibold text-gray-950 transition-colors group-hover:text-[#F7941D] dark:text-white">
                                {ticket.title}
                              </h3>
                            </button>

                            <div
                              className="flex shrink-0 items-center gap-2"
                              ref={openStatusDropdown === ticket.id ? dropdownRef : null}
                            >
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenStatusDropdown(openStatusDropdown === ticket.id ? null : ticket.id);
                                  }}
                                  disabled={changingStatus === ticket.id}
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${statusConfig.color}`}
                                >
                                  {changingStatus === ticket.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <StatusIcon className="h-3.5 w-3.5" />
                                  )}
                                  {statusConfig.label}
                                  <ChevronDown className="h-3 w-3" />
                                </button>

                                {openStatusDropdown === ticket.id && (
                                  <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                    <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
                                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {t('tickets:changeStatus')}
                                      </p>
                                    </div>
                                    {allStatuses.map((status) => {
                                      const config = getStatusConfig(status);
                                      const Icon = config.icon;
                                      const isCurrentStatus = ticket.status === status;

                                      return (
                                        <button
                                          key={status}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (!isCurrentStatus) {
                                              handleStatusChange(ticket.id, status);
                                            }
                                          }}
                                          disabled={isCurrentStatus}
                                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                            isCurrentStatus
                                              ? 'cursor-default bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                                              : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                                          }`}
                                        >
                                          <span className={`rounded p-1 ${config.color}`}>
                                            <Icon className="h-3 w-3" />
                                          </span>
                                          {config.label}
                                          {isCurrentStatus && (
                                            <span className="ml-auto text-xs text-gray-400">{t('tickets:current')}</span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-100 hover:text-[#F7941D] dark:hover:bg-gray-700"
                                onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                                aria-label="Przejdź do zgłoszenia"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <p
                            className="mb-3 line-clamp-2 cursor-pointer text-sm text-gray-500 dark:text-gray-400"
                            onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                          >
                            {ticket.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {ticket.category && <span>{ticket.category}</span>}
                            {ticket.category && <span className="text-gray-300">|</span>}

                            {ticket.creator && (
                              <span className="flex items-center gap-1.5">
                                {ticket.creator.avatar_url ? (
                                  <img
                                    src={getFileUrl(ticket.creator.avatar_url) || ''}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {getInitials(ticket.creator.first_name, ticket.creator.last_name)}
                                  </div>
                                )}
                                <span>
                                  {ticket.creator.first_name} {ticket.creator.last_name}
                                </span>
                              </span>
                            )}

                            {ticket.assignee && (
                              <>
                                <span className="text-gray-300">→</span>
                                <span className="flex items-center gap-1.5">
                                  {ticket.assignee.avatar_url ? (
                                    <img
                                      src={getFileUrl(ticket.assignee.avatar_url) || ''}
                                      alt=""
                                      className="h-5 w-5 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                      {getInitials(ticket.assignee.first_name, ticket.assignee.last_name)}
                                    </div>
                                  )}
                                  <span>
                                    {ticket.assignee.first_name} {ticket.assignee.last_name}
                                  </span>
                                </span>
                              </>
                            )}

                            <span className="ml-auto flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(ticket.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  Pokazano {pageStart}-{pageEnd} z {filteredTickets.length} zgłoszeń
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span>Na stronie</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 focus:border-[#F7941D] focus:outline-none focus:ring-2 focus:ring-[#F7941D]/30 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 font-medium text-gray-700 dark:text-gray-200">
                      {safeCurrentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default Tickets;
