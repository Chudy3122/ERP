import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { AlertCircle, Plus } from 'lucide-react';
import * as ticketApi from '../api/ticket.api';
import { Ticket, TicketStatus, TicketPriority } from '../types/ticket.types';

const Tickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'assigned' | 'all'>('my');
  const navigate = useNavigate();

  useEffect(() => {
    loadTickets();
  }, [activeTab]);

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

  const getStatusColor = (status: TicketStatus) => {
    const colors = {
      open: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-gray-200 text-gray-800',
      waiting_response: 'bg-gray-100 text-gray-700',
      resolved: 'bg-gray-200 text-gray-800',
      closed: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: TicketPriority) => {
    const colors = {
      low: 'text-gray-500',
      normal: 'text-gray-600',
      high: 'text-gray-700',
      urgent: 'text-gray-900',
    };
    return colors[priority];
  };

  return (
    <MainLayout title="Zgłoszenia">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zgłoszenia</h1>
          <p className="text-gray-600 mt-1">Zarządzaj zgłoszeniami i problemami</p>
        </div>
        <button
          onClick={() => navigate('/tickets/new')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nowe zgłoszenie
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Moje zgłoszenia
          </button>
          <button
            onClick={() => setActiveTab('assigned')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assigned'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Przypisane do mnie
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-gray-800 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Wszystkie zgłoszenia
          </button>
        </nav>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-md border border-gray-200">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Brak zgłoszeń</h3>
            <p className="text-gray-600 mb-6">Nie masz żadnych zgłoszeń w tej kategorii</p>
            <button
              onClick={() => navigate('/tickets/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors"
            >
              <Plus className="w-5 h-5" />
              Utwórz zgłoszenie
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => navigate(`/tickets/${ticket.id}/edit`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
                      <h3 className="text-base font-semibold text-gray-900">{ticket.title}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">{ticket.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span>{ticket.type}</span>
                      {ticket.category && <span>· {ticket.category}</span>}
                      <span>· {new Date(ticket.created_at).toLocaleDateString('pl-PL')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tickets;
