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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-violet-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Ładowanie kalendarza...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-100">Kalendarz Urlopów Zespołu</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/time-tracking/leave"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Month Navigation */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md font-medium transition-all duration-200 border border-violet-200"
              >
                ← Poprzedni
              </button>
              <h2 className="text-xl font-semibold text-slate-900">
                {getMonthName(selectedMonth)} {selectedYear}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-md font-medium transition-all duration-200 border border-violet-200"
              >
                Następny →
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
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
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Brak urlopów w tym miesiącu</h3>
            <p className="text-sm text-slate-600">Nie ma zaplanowanych urlopów dla wybranego okresu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  {/* Leave Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-semibold text-base border border-slate-200">
                        {request.user?.first_name?.[0]}{request.user?.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          {request.user?.first_name} {request.user?.last_name}
                        </h3>
                        <p className="text-sm text-slate-600">{request.user?.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Typ urlopu</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(request.leave_type)}`}></div>
                          <span className="text-sm font-semibold text-slate-900">
                            {getLeaveTypeLabel(request.leave_type)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Data rozpoczęcia</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(request.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Data zakończenia</p>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(request.end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Liczba dni</p>
                        <p className="text-sm font-semibold text-slate-900">{request.total_days}</p>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Powód:</p>
                        <p className="text-sm text-slate-900">{request.reason}</p>
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
