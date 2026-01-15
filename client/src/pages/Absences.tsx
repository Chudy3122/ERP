import { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { Calendar, Plus, X, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as timeApi from '../api/time.api';
import type { LeaveRequest, LeaveBalance } from '../types/time.types';

type LeaveType = 'vacation' | 'sick_leave' | 'remote_work' | 'other';

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
      setFormData({
        leave_type: 'vacation',
        start_date: '',
        end_date: '',
        reason: '',
      });
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

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: 'Urlop wypoczynkowy',
      sick_leave: 'L4 / Zwolnienie lekarskie',
      remote_work: 'Praca zdalna',
      other: 'Inne',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-700',
      approved: 'bg-gray-200 text-gray-800',
      rejected: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Oczekujące',
      approved: 'Zatwierdzone',
      rejected: 'Odrzucone',
      cancelled: 'Anulowane',
    };
    return labels[status] || status;
  };

  return (
    <MainLayout title="Nieobecności">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nieobecności</h1>
          <p className="text-gray-600 mt-1">Zarządzaj urlopami, zwolnieniami i pracą zdalną</p>
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
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Przysługujące dni urlopu</span>
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{balance.annualLeave}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Wykorzystane dni</span>
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{balance.usedDays}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Pozostało dni</span>
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{balance.remaining}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      {(user?.role === 'admin' || user?.role === 'team_leader') && (
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
              Moje wnioski
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Do zatwierdzenia
              {pendingRequests.length > 0 && (
                <span className="ml-2 bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Leave Requests List */}
      <div className="bg-white rounded-md border border-gray-200">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(activeTab === 'my' ? leaveRequests : pendingRequests).length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wniosków</h3>
                <p className="text-gray-600">
                  {activeTab === 'my'
                    ? 'Nie masz żadnych wniosków urlopowych'
                    : 'Nie ma wniosków do zatwierdzenia'}
                </p>
              </div>
            ) : (
              (activeTab === 'my' ? leaveRequests : pendingRequests).map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900">
                          {getLeaveTypeLabel(request.leave_type)}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {getStatusLabel(request.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span>
                          {new Date(request.start_date).toLocaleDateString('pl-PL')} -{' '}
                          {new Date(request.end_date).toLocaleDateString('pl-PL')}
                        </span>
                        <span className="font-medium">{request.total_days} dni</span>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      )}

                      {activeTab === 'pending' && request.user && (
                        <p className="text-sm text-gray-600 mt-2">
                          Pracownik: {request.user.first_name} {request.user.last_name}
                        </p>
                      )}
                    </div>

                    {activeTab === 'pending' && request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded text-sm font-medium"
                        >
                          Zatwierdź
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium"
                        >
                          Odrzuć
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Leave Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Nowy wniosek o nieobecność</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ nieobecności
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) =>
                    setFormData({ ...formData, leave_type: e.target.value as LeaveType })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data początkowa
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data końcowa
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Powód (opcjonalnie)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  placeholder="Dodatkowe informacje..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium"
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
