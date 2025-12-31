import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as timeApi from '../api/time.api';
import { LeaveRequest } from '../types/time.types';

const TeamLeaveCalendar: React.FC = () => {
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('approved');

  useEffect(() => {
    loadLeaveRequests();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    filterRequests();
  }, [allLeaveRequests, statusFilter, selectedMonth, selectedYear]);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      // For now, get all requests - in production, this should be filtered by date range on backend
      const requests = await timeApi.getPendingLeaveRequests();
      // Also get approved ones by calling user requests for all users (this is simplified)
      setAllLeaveRequests(requests);
    } catch (error) {
      console.error('Failed to load leave requests:', error);
      toast.error('Nie udało się załadować wniosków urlopowych');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = allLeaveRequests;

    // Filter by status
    if (statusFilter) {
      filtered = filtered.filter((req) => req.status === statusFilter);
    }

    // Filter by selected month/year
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

    filtered = filtered.filter((req) => {
      const startDate = new Date(req.start_date);
      const endDate = new Date(req.end_date);
      return (startDate <= monthEnd && endDate >= monthStart);
    });

    setFilteredRequests(filtered);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getLeaveTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      annual: 'Urlop wypoczynkowy',
      sick: 'Zwolnienie lekarskie',
      unpaid: 'Urlop bezpłatny',
      parental: 'Urlop rodzicielski',
      other: 'Inne',
    };
    return labels[type] || type;
  };

  const getLeaveTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      annual: 'bg-blue-500',
      sick: 'bg-red-500',
      unpaid: 'bg-gray-500',
      parental: 'bg-purple-500',
      other: 'bg-yellow-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getMonthName = (month: number): string => {
    const months = [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ];
    return months[month];
  };

  const navigateMonth = (direction: number) => {
    const newMonth = selectedMonth + direction;
    if (newMonth < 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else if (newMonth > 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(newMonth);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Ładowanie kalendarza...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      {/* Header */}
      <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg ring-2 ring-white/30">
                📅
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">Kalendarz Urlopów Zespołu</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/time-tracking/leave"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 font-medium text-white shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
              >
                ← Zarządzanie urlopami
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-semibold transition-all"
              >
                ← Poprzedni
              </button>
              <h2 className="text-2xl font-bold text-gray-900">
                {getMonthName(selectedMonth)} {selectedYear}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-semibold transition-all"
              >
                Następny →
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-gray-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Wszystkie</option>
                <option value="pending">Oczekujące</option>
                <option value="approved">Zatwierdzone</option>
                <option value="rejected">Odrzucone</option>
                <option value="cancelled">Anulowane</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leave List */}
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Brak urlopów w tym miesiącu</h3>
            <p className="text-gray-600">Nie ma zaplanowanych urlopów dla wybranego okresu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  {/* Leave Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                        {request.user?.first_name?.[0]}{request.user?.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">
                          {request.user?.first_name} {request.user?.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">{request.user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Typ urlopu</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type)}`}></div>
                          <span className="text-sm font-semibold text-gray-900">
                            {getLeaveTypeLabel(request.leave_type)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Data rozpoczęcia</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(request.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Data zakończenia</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(request.end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Liczba dni</p>
                        <p className="text-sm font-semibold text-gray-900">{request.total_days}</p>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Powód:</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(request.status)}`}>
                      {request.status === 'pending' && 'Oczekujący'}
                      {request.status === 'approved' && 'Zatwierdzony'}
                      {request.status === 'rejected' && 'Odrzucony'}
                      {request.status === 'cancelled' && 'Anulowany'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamLeaveCalendar;
