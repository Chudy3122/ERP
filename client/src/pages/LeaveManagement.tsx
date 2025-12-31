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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">📅 Zarządzanie Urlopami</h1>
          <Link
            to="/time-tracking"
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            ← Ewidencja czasu
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {balance && (
            <>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Roczny limit</p>
                <p className="text-3xl font-bold text-gray-900">{balance.annualLeave} dni</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Wykorzystane</p>
                <p className="text-3xl font-bold text-orange-600">{balance.usedDays} dni</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-sm text-gray-600">Pozostało</p>
                <p className="text-3xl font-bold text-green-600">{balance.remaining} dni</p>
              </div>
            </>
          )}
          <div className="bg-white p-6 rounded-lg shadow flex items-center justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              + Nowy wniosek
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Nowy wniosek urlopowy</h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ urlopu
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) =>
                    setFormData({ ...formData, leaveType: e.target.value as LeaveType })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data rozpoczęcia
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data zakończenia
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Powód (opcjonalny)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Złóż wniosek
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Anuluj
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Moje wnioski urlopowe</h2>
            {requests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Brak wniosków</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Typ
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Od - Do
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Dni
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {requests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {getLeaveTypeLabel(request.leave_type)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {request.total_days}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : request.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
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
                              className="text-red-600 hover:text-red-800"
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
