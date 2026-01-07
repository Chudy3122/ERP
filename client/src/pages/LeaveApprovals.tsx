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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">Ładowanie wniosków...</p>
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
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-slate-100">Zatwierdzanie Wniosków Urlopowych</h1>
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
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Oczekujące wnioski</h2>
              <p className="text-sm text-slate-600 mt-1">Wnioski wymagające Twojej decyzji</p>
            </div>
            <div className="text-center px-4 py-2 bg-teal-50 rounded-lg border border-teal-100">
              <div className="text-3xl font-bold text-teal-600">{pendingRequests.length}</div>
              <p className="text-xs text-slate-600 mt-1">Do zatwierdzenia</p>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-slate-200">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Brak oczekujących wniosków</h3>
            <p className="text-sm text-slate-600">Wszystkie wnioski zostały rozpatrzone</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Request Info */}
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
                      <div className="mt-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Powód:</p>
                        <p className="text-sm text-slate-900">{request.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col gap-2">
                    <button
                      onClick={() => openModal(request, 'approve')}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Zatwierdź
                    </button>
                    <button
                      onClick={() => openModal(request, 'reject')}
                      className="flex-1 md:flex-none px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors duration-200"
                    >
                      Odrzuć
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className={`p-5 border-b ${
              modalAction === 'approve'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <h2 className={`text-lg font-semibold ${
                modalAction === 'approve' ? 'text-emerald-900' : 'text-red-900'
              }`}>
                {modalAction === 'approve' ? 'Zatwierdzanie wniosku' : 'Odrzucanie wniosku'}
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-4 space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Pracownik:</span> {selectedRequest.user?.first_name} {selectedRequest.user?.last_name}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Typ urlopu:</span> {getLeaveTypeLabel(selectedRequest.leave_type)}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Okres:</span> {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-medium">Liczba dni:</span> {selectedRequest.total_days}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notatka {modalAction === 'reject' && '(wymagana)'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={modalAction === 'approve' ? 'Opcjonalna notatka...' : 'Powód odrzucenia...'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={modalAction === 'approve' ? handleApprove : handleReject}
                  disabled={modalAction === 'reject' && !notes.trim()}
                  className={`flex-1 px-5 py-2.5 rounded-md font-medium text-sm transition-colors duration-200 ${
                    modalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {modalAction === 'approve' ? 'Zatwierdź' : 'Odrzuć'}
                </button>
                <button
                  onClick={closeModal}
                  className="flex-1 px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-md font-medium text-sm transition-colors duration-200"
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
