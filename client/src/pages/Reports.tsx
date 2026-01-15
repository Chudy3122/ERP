import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as reportApi from '../api/report.api';
import * as adminApi from '../api/admin.api';
import type { ReportFilters, TimeReportData } from '../api/report.api';
import type { AdminUser } from '../types/admin.types';

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<TimeReportData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const usersList = await adminApi.getUsers();
      setUsers(usersList);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ReportFilters = {
        startDate,
        endDate,
        userId: selectedUserId || undefined,
        status: selectedStatus || undefined,
      };

      const data = await reportApi.getTimeReport(filters);
      setReportData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się wygenerować raportu');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting('excel');
      setError(null);

      const filters: ReportFilters = {
        startDate,
        endDate,
        userId: selectedUserId || undefined,
        status: selectedStatus || undefined,
      };

      const blob = await reportApi.exportTimeReportExcel(filters);

      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport_czasu_pracy_${startDate}_${endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się wyeksportować do Excel');
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting('pdf');
      setError(null);

      const filters: ReportFilters = {
        startDate,
        endDate,
        userId: selectedUserId || undefined,
        status: selectedStatus || undefined,
      };

      const blob = await reportApi.exportTimeReportPDF(filters);

      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport_czasu_pracy_${startDate}_${endDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Nie udało się wyeksportować do PDF');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <nav className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Raporty</h1>
                <p className="text-sm text-slate-400">Generuj i eksportuj raporty</p>
              </div>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
            >
              ← Panel główny
            </Link>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Filtry raportu</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data od:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data do:
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Pracownik:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Wszyscy</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Wszystkie</option>
                <option value="in_progress">W trakcie</option>
                <option value="completed">Ukończony</option>
                <option value="approved">Zatwierdzony</option>
                <option value="rejected">Odrzucony</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200"
            >
              {loading ? 'Generowanie...' : 'Generuj raport'}
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!reportData || exporting !== null}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200 flex items-center gap-2"
            >
              {exporting === 'excel' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Eksportowanie...
                </>
              ) : (
                <>📊 Eksportuj Excel</>
              )}
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!reportData || exporting !== null}
              className="px-6 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-slate-300 disabled:text-slate-500 font-medium text-sm transition-colors duration-200 flex items-center gap-2"
            >
              {exporting === 'pdf' ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Eksportowanie...
                </>
              ) : (
                <>📄 Eksportuj PDF</>
              )}
            </button>
          </div>
        </div>

        {/* Report Summary */}
        {reportData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Łączny czas pracy</p>
                <p className="text-2xl font-bold text-slate-900">
                  {reportData.summary.totalHours}h {reportData.summary.totalMinutes}m
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Nadgodziny</p>
                <p className="text-2xl font-bold text-amber-600">
                  {reportData.summary.overtimeHours}h {reportData.summary.overtimeMinutes}m
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Spóźnienia</p>
                <p className="text-2xl font-bold text-red-600">
                  {reportData.summary.lateArrivals} ({reportData.summary.totalLateMinutes} min)
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Dni przepracowane</p>
                <p className="text-2xl font-bold text-slate-900">
                  {reportData.summary.daysWorked}
                </p>
              </div>
            </div>

            {/* Entries Count */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <h3 className="text-lg font-semibold mb-4 text-slate-900">
                Znaleziono {reportData.entries.length} wpisów
              </h3>
              <p className="text-sm text-slate-600">
                Średnia dzienna: {reportData.summary.averageHoursPerDay.toFixed(2)} godzin
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
