import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  AlertCircle,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  ChevronRight,
  Inbox,
  PlayCircle,
  PauseCircle,
  Archive,
  Bug,
  Lightbulb,
  HelpCircle,
  LifeBuoy,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import * as ticketApi from '../api/ticket.api';
import { Ticket, TicketStatus, TicketPriority, TicketType } from '../types/ticket.types';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'rejected' | 'closed';
type ViewTab = 'my' | 'assigned' | 'all';

const Tickets = () => {
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const activeTab = (searchParams.get('tab') as ViewTab) || 'my';
  const isAdmin = user?.role === 'admin' || user?.role === 'team_leader';

  useEffect(() => {
    loadTickets();
  }, [activeTab]);

  // Close dropdown when clicking outside
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
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveTab = (tab: ViewTab) => {
    setSearchParams({ tab });
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      setChangingStatus(ticketId);
      await ticketApi.updateTicketStatus(ticketId, newStatus);
      // Update ticket locally
      setTickets(prev => prev.map(t =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      ));
      setOpenStatusDropdown(null);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setChangingStatus(null);
    }
  };

  // Filter tickets based on all criteria
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          ticket.title.toLowerCase().includes(query) ||
          ticket.ticket_number.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && ticket.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && ticket.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, typeFilter]);

  // Group tickets by status for stats
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

  const getStatusConfig = (status: TicketStatus) => {
    const configs: Record<TicketStatus, { label: string; color: string; icon: typeof Inbox; dotColor: string }> = {
      open: {
        label: 'Nowe',
        color: 'bg-blue-100 text-blue-700',
        icon: Inbox,
        dotColor: 'bg-blue-500',
      },
      in_progress: {
        label: 'W trakcie',
        color: 'bg-yellow-100 text-yellow-700',
        icon: PlayCircle,
        dotColor: 'bg-yellow-500',
      },
      waiting_response: {
        label: 'Oczekuje',
        color: 'bg-purple-100 text-purple-700',
        icon: PauseCircle,
        dotColor: 'bg-purple-500',
      },
      resolved: {
        label: 'Rozwiązane',
        color: 'bg-green-100 text-green-700',
        icon: CheckCircle2,
        dotColor: 'bg-green-500',
      },
      rejected: {
        label: 'Odrzucone',
        color: 'bg-red-100 text-red-700',
        icon: XCircle,
        dotColor: 'bg-red-500',
      },
      closed: {
        label: 'Zamknięte',
        color: 'bg-gray-100 text-gray-600',
        icon: Archive,
        dotColor: 'bg-gray-400',
      },
    };
    return configs[status];
  };

  const getPriorityConfig = (priority: TicketPriority) => {
    const configs = {
      low: { label: 'Niski', color: 'text-gray-500', bgColor: 'bg-gray-100' },
      normal: { label: 'Normalny', color: 'text-blue-600', bgColor: 'bg-blue-50' },
      high: { label: 'Wysoki', color: 'text-orange-600', bgColor: 'bg-orange-50' },
      urgent: { label: 'Pilne', color: 'text-red-600', bgColor: 'bg-red-50' },
    };
    return configs[priority];
  };

  const getTypeConfig = (type: TicketType) => {
    const configs = {
      bug: { label: 'Błąd', icon: Bug, color: 'text-red-500' },
      feature_request: { label: 'Nowa funkcja', icon: Lightbulb, color: 'text-yellow-500' },
      support: { label: 'Wsparcie', icon: LifeBuoy, color: 'text-blue-500' },
      question: { label: 'Pytanie', icon: HelpCircle, color: 'text-purple-500' },
      other: { label: 'Inne', icon: MoreHorizontal, color: 'text-gray-500' },
    };
    return configs[type];
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Dzisiaj, ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Wczoraj, ' + d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays} dni temu`;
    } else {
      return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTypeFilter('all');
  };

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || typeFilter !== 'all' || searchQuery !== '';

  const allStatuses: TicketStatus[] = [
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_RESPONSE,
    TicketStatus.RESOLVED,
    TicketStatus.REJECTED,
    TicketStatus.CLOSED
  ];

  return (
    <MainLayout title="Zgłoszenia">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Zgłoszenia</h1>
            <p className="text-gray-500 mt-1 text-sm">Zarządzaj zgłoszeniami i problemami</p>
          </div>
          <button
            onClick={() => navigate('/tickets/new')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Nowe zgłoszenie
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'all' ? 'border-gray-800 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{ticketStats.total}</div>
            <div className="text-xs text-gray-500">Wszystkie</div>
          </button>
          <button
            onClick={() => setStatusFilter('open')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'open' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-blue-600">{ticketStats.open}</div>
            <div className="text-xs text-gray-500">Nowe</div>
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'in_progress' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-yellow-600">{ticketStats.in_progress}</div>
            <div className="text-xs text-gray-500">W trakcie</div>
          </button>
          <button
            onClick={() => setStatusFilter('resolved')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'resolved' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-green-600">{ticketStats.resolved}</div>
            <div className="text-xs text-gray-500">Rozwiązane</div>
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'rejected' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-red-600">{ticketStats.rejected}</div>
            <div className="text-xs text-gray-500">Odrzucone</div>
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === 'closed' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-2xl font-bold text-gray-600">{ticketStats.closed}</div>
            <div className="text-xs text-gray-500">Zamknięte</div>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('my')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'my'
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Moje zgłoszenia
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'assigned'
                    ? 'border-gray-800 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Przypisane do mnie
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('all')}
                  className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'all'
                      ? 'border-gray-800 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Wszystkie
                </button>
              )}
            </nav>

            {/* Search & Filter */}
            <div className="flex items-center gap-2 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Szukaj zgłoszeń..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 w-64 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  hasActiveFilters
                    ? 'border-gray-800 bg-gray-800 text-white'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtry
                {hasActiveFilters && (
                  <span className="ml-1 w-5 h-5 bg-white text-gray-800 rounded-full text-xs flex items-center justify-center font-medium">
                    {[statusFilter !== 'all', priorityFilter !== 'all', typeFilter !== 'all'].filter(Boolean).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Priorytet:</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-gray-400"
                >
                  <option value="all">Wszystkie</option>
                  <option value="low">Niski</option>
                  <option value="normal">Normalny</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilne</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Typ:</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TicketType | 'all')}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-gray-400"
                >
                  <option value="all">Wszystkie</option>
                  <option value="bug">Błąd</option>
                  <option value="feature_request">Nowa funkcja</option>
                  <option value="support">Wsparcie</option>
                  <option value="question">Pytanie</option>
                  <option value="other">Inne</option>
                </select>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Wyczyść filtry
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tickets List */}
        {isLoading ? (
          <div className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
            <p className="text-sm text-gray-500">Ładowanie zgłoszeń...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters ? 'Brak wyników' : 'Brak zgłoszeń'}
            </h3>
            <p className="text-gray-500 mb-6 text-sm">
              {hasActiveFilters
                ? 'Nie znaleziono zgłoszeń pasujących do wybranych filtrów'
                : 'Nie masz żadnych zgłoszeń w tej kategorii'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Wyczyść filtry
              </button>
            ) : (
              <button
                onClick={() => navigate('/tickets/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Utwórz zgłoszenie
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket) => {
              const statusConfig = getStatusConfig(ticket.status);
              const priorityConfig = getPriorityConfig(ticket.priority);
              const typeConfig = getTypeConfig(ticket.type);
              const StatusIcon = statusConfig.icon;
              const TypeIcon = typeConfig.icon;

              return (
                <div
                  key={ticket.id}
                  className="p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start gap-4">
                    {/* Type Icon */}
                    <div
                      className={`mt-0.5 p-2 rounded-lg bg-gray-100 ${typeConfig.color} cursor-pointer`}
                      onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                    >
                      <TypeIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div
                          className="flex items-center gap-2 flex-wrap cursor-pointer"
                          onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                        >
                          <span className="text-xs font-mono text-gray-400">{ticket.ticket_number}</span>
                          <h3 className="font-semibold text-gray-900 group-hover:text-gray-700">
                            {ticket.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" ref={openStatusDropdown === ticket.id ? dropdownRef : null}>
                          {/* Status dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusDropdown(openStatusDropdown === ticket.id ? null : ticket.id);
                              }}
                              disabled={changingStatus === ticket.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig.color} hover:opacity-80 transition-opacity`}
                            >
                              {changingStatus === ticket.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <StatusIcon className="w-3 h-3" />
                              )}
                              {statusConfig.label}
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {/* Dropdown menu */}
                            {openStatusDropdown === ticket.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <div className="px-3 py-2 border-b border-gray-100">
                                  <p className="text-xs font-medium text-gray-500">Zmień status na:</p>
                                </div>
                                {allStatuses.map((status) => {
                                  const config = getStatusConfig(status);
                                  const Icon = config.icon;
                                  const isCurrentStatus = ticket.status === status;

                                  return (
                                    <button
                                      key={status}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isCurrentStatus) {
                                          handleStatusChange(ticket.id, status);
                                        }
                                      }}
                                      disabled={isCurrentStatus}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                                        isCurrentStatus
                                          ? 'bg-gray-50 text-gray-400 cursor-default'
                                          : 'hover:bg-gray-50 text-gray-700'
                                      }`}
                                    >
                                      <span className={`p-1 rounded ${config.color}`}>
                                        <Icon className="w-3 h-3" />
                                      </span>
                                      {config.label}
                                      {isCurrentStatus && (
                                        <span className="ml-auto text-xs text-gray-400">Aktualny</span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <ChevronRight
                            className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                          />
                        </div>
                      </div>

                      <p
                        className="text-sm text-gray-500 mb-3 line-clamp-1 cursor-pointer"
                        onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                      >
                        {ticket.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {/* Priority */}
                        <span className={`px-2 py-0.5 rounded ${priorityConfig.bgColor} ${priorityConfig.color} font-medium`}>
                          {priorityConfig.label}
                        </span>

                        {/* Type */}
                        <span className="flex items-center gap-1">
                          {typeConfig.label}
                        </span>

                        {/* Category */}
                        {ticket.category && (
                          <span className="text-gray-400">
                            {ticket.category}
                          </span>
                        )}

                        {/* Separator */}
                        <span className="text-gray-300">|</span>

                        {/* Creator */}
                        {ticket.creator && (
                          <span className="flex items-center gap-1.5">
                            {ticket.creator.avatar_url ? (
                              <img
                                src={getFileUrl(ticket.creator.avatar_url) || ''}
                                alt=""
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600">
                                {getInitials(ticket.creator.first_name, ticket.creator.last_name)}
                              </div>
                            )}
                            <span>{ticket.creator.first_name} {ticket.creator.last_name}</span>
                          </span>
                        )}

                        {/* Assignee */}
                        {ticket.assignee && (
                          <>
                            <span className="text-gray-300">→</span>
                            <span className="flex items-center gap-1.5">
                              {ticket.assignee.avatar_url ? (
                                <img
                                  src={getFileUrl(ticket.assignee.avatar_url) || ''}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-medium text-gray-600">
                                  {getInitials(ticket.assignee.first_name, ticket.assignee.last_name)}
                                </div>
                              )}
                              <span>{ticket.assignee.first_name} {ticket.assignee.last_name}</span>
                            </span>
                          </>
                        )}

                        {/* Date */}
                        <span className="flex items-center gap-1 ml-auto">
                          <Calendar className="w-3 h-3" />
                          {formatDate(ticket.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer with count */}
        {!isLoading && filteredTickets.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Wyświetlono {filteredTickets.length} z {tickets.length} zgłoszeń
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tickets;
