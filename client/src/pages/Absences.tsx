import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Calendar, Plus, X, Clock, Home, Umbrella, Heart, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as timeApi from '../api/time.api';
import type { LeaveRequest, LeaveBalance } from '../types/time.types';

type LeaveType = 'vacation' | 'sick_leave' | 'remote_work' | 'other';

const leaveTypeConfig: Record<LeaveType, { label: string; icon: React.ReactNode; color: string }> = {
  vacation:   { label: 'Urlop wypoczynkowy',       icon: <Umbrella className="w-4 h-4" />,      color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  sick_leave: { label: 'L4 / Zwolnienie lekarskie', icon: <Heart className="w-4 h-4" />,         color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  remote_work:{ label: 'Praca zdalna',              icon: <Home className="w-4 h-4" />,          color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  other:      { label: 'Inne',                      icon: <MoreHorizontal className="w-4 h-4" />, color: 'text-gray-500 bg-gray-100 dark:bg-gray-700' },
};

const Absences = () => {
  const { user } = useAuth();

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'pending'>('my');

  const [formData, setFormData] = useState({
    leave_type: 'vacation' as LeaveType,
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [requests, leaveBalance] = await Promise.all([
        timeApi.getUserLeaveRequests(),
        timeApi.getUserLeaveBalance(),
      ]);
      setLeaveRequests(requests);
      setBalance(leaveBalance);

      if (user?.role === 'admin' || user?.role === 'team_leader') {
        const pending = await timeApi.getPendingLeaveRequests();
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timeApi.createLeaveRequest({
        leaveType: formData.leave_type as any,
        startDate: formData.start_date,
        endDate: formData.end_date,
        reason: formData.reason,
      });
      setShowForm(false);
      setFormData({ leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się utworzyć wniosku');
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await timeApi.approveLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się zatwierdzić wniosku');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await timeApi.rejectLeaveRequest(requestId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się odrzucić wniosku');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; classes: string }> = {
      pending:   { label: 'Oczekujące',  classes: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
      approved:  { label: 'Zatwierdzone', classes: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
      rejected:  { label: 'Odrzucone',   classes: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
      cancelled: { label: 'Anulowane',   classes: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
    };
    return configs[status] || configs.cancelled;
  };

  const balanceCards = [
    { label: 'Przysługujące dni urlopu', value: balance?.annualLeave, icon: <Calendar className="w-5 h-5 text-blue-400" />, accent: 'border-l-4 border-blue-400' },
    { label: 'Wykorzystane dni',         value: balance?.usedDays,    icon: <Clock className="w-5 h-5 text-amber-400" />,   accent: 'border-l-4 border-amber-400' },
    { label: 'Pozostało dni',            value: balance?.remaining,   icon: <Calendar className="w-5 h-5 text-emerald-400" />, accent: 'border-l-4 border-emerald-400' },
  ];

  return (
    <MainLayout title="Nieobecności">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nieobecności</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Zarządzaj urlopami, zwolnieniami i pracą zdalną</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Nowy wniosek
        </button>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {balanceCards.map((card) => (
            <div key={card.label} className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${card.accent}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                {card.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{card.value ?? '—'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {(user?.role === 'admin' || user?.role === 'team_leader') && (
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'my'
                  ? 'border-gray-800 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Moje wnioski
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'pending'
                  ? 'border-gray-800 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Do zatwierdzenia
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {(activeTab === 'my' ? leaveRequests : pendingRequests).length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Brak wniosków</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {activeTab === 'my' ? 'Nie masz żadnych wniosków urlopowych' : 'Nie ma wniosków do zatwierdzenia'}
                </p>
              </div>
            ) : (
              (activeTab === 'my' ? leaveRequests : pendingRequests).map((request) => {
                const typeConfig = leaveTypeConfig[request.leave_type as LeaveType] || leaveTypeConfig.other;
                const statusCfg = getStatusConfig(request.status);
                return (
                  <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Type icon */}
                        <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${typeConfig.color}`}>
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {typeConfig.label}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.classes}`}>
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              {new Date(request.start_date).toLocaleDateString('pl-PL')} –{' '}
                              {new Date(request.end_date).toLocaleDateString('pl-PL')}
                            </span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{request.total_days} dni</span>
                          </div>
                          {request.reason && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{request.reason}</p>
                          )}
                          {activeTab === 'pending' && request.user && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Pracownik: <span className="font-medium text-gray-700 dark:text-gray-300">{request.user.first_name} {request.user.last_name}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {activeTab === 'pending' && request.status === 'pending' && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-md text-sm font-medium transition-colors"
                          >
                            Zatwierdź
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
                          >
                            Odrzuć
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Create Leave Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nowy wniosek o nieobecność</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Typ nieobecności
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value as LeaveType })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  required
                >
                  <option value="vacation">Urlop wypoczynkowy</option>
                  <option value="sick_leave">L4 / Zwolnienie lekarskie</option>
                  <option value="remote_work">Praca zdalna</option>
                  <option value="other">Inne</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data początkowa
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data końcowa
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Powód (opcjonalnie)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                  placeholder="Dodatkowe informacje..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md font-medium transition-colors"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium transition-colors"
                >
                  Złóż wniosek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Absences;
