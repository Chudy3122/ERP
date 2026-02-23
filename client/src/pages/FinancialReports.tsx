import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { FileSpreadsheet, FileText, Calendar, Loader2 } from 'lucide-react';
import * as financialReportApi from '../api/financialReport.api';
import {
  RevenueOverTimeData,
  RevenueByClientData,
  StatusDistributionData,
  PaymentOverviewData,
  ReportFilters,
  ReportPeriod,
} from '../types/financialReport.types';
import RevenueChartWidget from '../components/reports/RevenueChartWidget';
import RevenueByClientWidget from '../components/reports/RevenueByClientWidget';
import InvoiceStatusPieChart from '../components/reports/InvoiceStatusPieChart';
import PaymentOverviewWidget from '../components/reports/PaymentOverviewWidget';

const FinancialReports = () => {
  const { t } = useTranslation('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);

  // Data states
  const [revenueOverTime, setRevenueOverTime] = useState<RevenueOverTimeData[]>([]);
  const [revenueByClient, setRevenueByClient] = useState<RevenueByClientData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionData[]>([]);
  const [paymentOverview, setPaymentOverview] = useState<PaymentOverviewData | null>(null);

  // Filter states
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 12);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    loadReportData();
  }, [period, dateRange]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      const filters: ReportFilters = {
        start_date: dateRange.start,
        end_date: dateRange.end,
        period,
      };

      const [revenue, clients, status, overview] = await Promise.all([
        financialReportApi.getRevenueOverTime(filters),
        financialReportApi.getRevenueByClient({ ...filters, limit: 10 }),
        financialReportApi.getStatusDistribution(filters),
        financialReportApi.getPaymentOverview(filters),
      ]);

      setRevenueOverTime(revenue);
      setRevenueByClient(clients);
      setStatusDistribution(status);
      setPaymentOverview(overview);
    } catch (error) {
      console.error('Failed to load report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      const filters: ReportFilters = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      const blob = await financialReportApi.exportExcel(filters);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport-finansowy-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Excel:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      const filters: ReportFilters = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };
      const blob = await financialReportApi.exportPdf(filters);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raport-finansowy-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <MainLayout title={t('title')}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
          >
            {isExporting === 'excel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {t('exportExcel')}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
          >
            {isExporting === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {t('exportPdf')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">{t('dateRange')}:</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t('period')}:</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
          >
            <option value="daily">{t('periodDaily')}</option>
            <option value="weekly">{t('periodWeekly')}</option>
            <option value="monthly">{t('periodMonthly')}</option>
          </select>
        </div>
      </div>

      {/* Payment Overview */}
      <PaymentOverviewWidget data={paymentOverview} isLoading={isLoading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <RevenueChartWidget data={revenueOverTime} isLoading={isLoading} />
        <InvoiceStatusPieChart data={statusDistribution} isLoading={isLoading} />
      </div>

      {/* Revenue by Client */}
      <div className="mt-6">
        <RevenueByClientWidget data={revenueByClient} isLoading={isLoading} />
      </div>
    </MainLayout>
  );
};

export default FinancialReports;
