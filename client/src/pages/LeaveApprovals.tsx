import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import * as timeApi from '../api/time.api';
import { LeaveRequest } from '../types/time.types';

const LeaveApprovals: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPendingRequests();
  }, []);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const requests = await timeApi.getPendingLeaveRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Failed to load pending requests:', error);
      toast.error('Nie udało się załadować oczekujących wniosków');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (request: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setModalAction(action);
    setNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setNotes('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await timeApi.approveLeaveRequest(selectedRequest.id, { notes });
      toast.success('Wniosek zatwierdzony pomyślnie');
      closeModal();
      loadPendingRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się zatwierdzić wniosku');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await timeApi.rejectLeaveRequest(selectedRequest.id, { notes });
      toast.success('Wniosek odrzucony');
      closeModal();
      loadPendingRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Nie udało się odrzucić wniosku');
    }
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
      annual: 'bg-blue-100 text-blue-800',
      sick: 'bg-red-100 text-red-800',
      unpaid: 'bg-gray-100 text-gray-800',
      parental: 'bg-purple-100 text-purple-800',
      other: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Ładowanie wniosków...</p>
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
                ✅
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">Zatwierdzanie Wniosków Urlopowych</h1>
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
        {/* Stats Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Oczekujące wnioski</h2>
              <p className="text-gray-600 mt-1">Wnioski wymagające Twojej decyzji</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600">{pendingRequests.length}</div>
              <p className="text-sm text-gray-600 mt-1">Do zatwierdzenia</p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center border border-gray-100">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Brak oczekujących wniosków</h3>
            <p className="text-gray-600">Wszystkie wnioski zostały rozpatrzone</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Request Info */}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Typ urlopu</p>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getLeaveTypeColor(request.leave_type)}`}>
                          {getLeaveTypeLabel(request.leave_type)}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Data rozpoczęcia</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(request.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Data zakończenia</p>
                        <p className="text-sm font-semibold text-gray-900">{formatDate(request.end_date)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Liczba dni:</span>
                        <span>{request.total_days}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">Data złożenia:</span>
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Powód:</p>
                        <p className="text-sm text-gray-900">{request.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-3">
                    <button
                      onClick={() => openModal(request, 'approve')}
                      className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      ✅ Zatwierdź
                    </button>
                    <button
                      onClick={() => openModal(request, 'reject')}
                      className="flex-1 md:flex-none px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      ❌ Odrzuć
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className={`p-6 rounded-t-2xl ${
              modalAction === 'approve'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600'
                : 'bg-gradient-to-r from-red-600 to-orange-600'
            }`}>
              <h2 className="text-2xl font-bold text-white">
                {modalAction === 'approve' ? 'Zatwierdzanie wniosku' : 'Odrzucanie wniosku'}
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Pracownik:</strong> {selectedRequest.user?.first_name} {selectedRequest.user?.last_name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Typ urlopu:</strong> {getLeaveTypeLabel(selectedRequest.leave_type)}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Okres:</strong> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Liczba dni:</strong> {selectedRequest.total_days}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notatka {modalAction === 'reject' && '(wymagana)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={modalAction === 'approve' ? 'Opcjonalna notatka...' : 'Powód odrzucenia...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={modalAction === 'approve' ? handleApprove : handleReject}
                  disabled={modalAction === 'reject' && !notes.trim()}
                  className={`flex-1 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${
                    modalAction === 'approve'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-red-600 to-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {modalAction === 'approve' ? 'Zatwierdź' : 'Odrzuć'}
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-semibold transition-all duration-200"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApprovals;
