import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as timeApi from '../api/time.api';
import { LeaveRequest, LeaveType, LeaveBalance } from '../types/time.types';

const LeaveManagement: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leaveType: LeaveType.VACATION,
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [leaveRequests, leaveBalance] = await Promise.all([
        timeApi.getUserLeaveRequests(),
        timeApi.getUserLeaveBalance(),
      ]);
      setRequests(leaveRequests);
      setBalance(leaveBalance);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timeApi.createLeaveRequest(formData);
      await loadData();
      setShowForm(false);
      setFormData({
        leaveType: LeaveType.VACATION,
        startDate: '',
        endDate: '',
        reason: '',
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create leave request');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Czy na pewno chcesz anulować ten wniosek?')) return;
    try {
      await timeApi.cancelLeaveRequest(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  const getLeaveTypeLabel = (type: LeaveType): string => {
    const labels = {
      vacation: 'Urlop wypoczynkowy',
      sick_leave: 'Zwolnienie lekarskie',
      personal: 'Urlop okolicznościowy',
      unpaid: 'Urlop bezpłatny',
      parental: 'Urlop rodzicielski',
      other: 'Inny',
    };
    return labels[type];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Zarządzanie Urlopami</h1>
                <p className="text-sm text-slate-400">Wnioski i bilans urlopowy</p>
              </div>
            </div>
            <Link
              to="/time-tracking"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
            >
              ← Ewidencja czasu
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {balance && (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <p className="text-sm text-slate-600">Roczny limit</p>
                <p className="text-3xl font-bold text-slate-900">{balance.annualLeave} dni</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <p className="text-sm text-slate-600">Wykorzystane</p>
                <p className="text-3xl font-bold text-amber-600">{balance.usedDays} dni</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <p className="text-sm text-slate-600">Pozostało</p>
                <p className="text-3xl font-bold text-emerald-600">{balance.remaining} dni</p>
              </div>
            </>
          )}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full py-2.5 bg-teal-600 text-white rounded-md hover:bg-teal-700 font-medium text-sm transition-colors duration-200"
            >
              + Nowy wniosek
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6 border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Nowy wniosek urlopowy</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Typ urlopu
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) =>
                    setFormData({ ...formData, leaveType: e.target.value as LeaveType })
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value={LeaveType.VACATION}>Urlop wypoczynkowy</option>
                  <option value={LeaveType.SICK_LEAVE}>Zwolnienie lekarskie</option>
                  <option value={LeaveType.PERSONAL}>Urlop okolicznościowy</option>
                  <option value={LeaveType.UNPAID}>Urlop bezpłatny</option>
                  <option value={LeaveType.PARENTAL}>Urlop rodzicielski</option>
                  <option value={LeaveType.OTHER}>Inny</option>
                </select>
              </div>
              <div></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data rozpoczęcia
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Data zakończenia
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Powód (opcjonalny)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="bg-emerald-600 text-white px-6 py-2.5 rounded-md hover:bg-emerald-700 font-medium text-sm transition-colors duration-200"
              >
                Złóż wniosek
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-md hover:bg-slate-300 font-medium text-sm transition-colors duration-200"
              >
                Anuluj
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-slate-900">Moje wnioski urlopowe</h2>
            {requests.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">Brak wniosków</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Od - Do
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Dni
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {getLeaveTypeLabel(request.leave_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {request.total_days}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : request.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {request.status === 'pending'
                              ? 'Oczekuje'
                              : request.status === 'approved'
                              ? 'Zatwierdzony'
                              : request.status === 'rejected'
                              ? 'Odrzucony'
                              : 'Anulowany'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(request.status === 'pending' || request.status === 'approved') && (
                            <button
                              onClick={() => handleCancel(request.id)}
                              className="text-red-600 hover:text-red-800 font-medium transition-colors duration-200"
                            >
                              Anuluj
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;
