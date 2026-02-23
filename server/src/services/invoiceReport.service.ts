import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import invoiceService from './invoice.service';

interface ReportFilters {
  start_date?: Date;
  end_date?: Date;
}

interface ExportData {
  revenueOverTime: any[];
  revenueByClient: any[];
  statusDistribution: any[];
  paymentOverview: any;
}

class InvoiceReportService {
  private fontPath: string;

  constructor() {
    // Use DejaVu Sans for Polish character support
    this.fontPath = path.join(__dirname, '../assets/fonts/DejaVuSans.ttf');
  }

  /**
   * Generate Excel report with financial data
   */
  async generateExcelReport(filters: ReportFilters): Promise<Buffer> {
    // Fetch all report data
    const data = await this.fetchReportData(filters);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Revenue Over Time
    if (data.revenueOverTime.length > 0) {
      const revenueSheet = XLSX.utils.json_to_sheet(
        data.revenueOverTime.map((row) => ({
          Okres: row.period,
          'Kwota netto': Number(row.net_total).toFixed(2),
          'Kwota brutto': Number(row.gross_total).toFixed(2),
          'Zapłacono': Number(row.paid_amount).toFixed(2),
          'Liczba faktur': row.invoice_count,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Przychody w czasie');
    }

    // Sheet 2: Revenue By Client
    if (data.revenueByClient.length > 0) {
      const clientSheet = XLSX.utils.json_to_sheet(
        data.revenueByClient.map((row) => ({
          Klient: row.client_name,
          'Łączna kwota brutto': Number(row.total_gross).toFixed(2),
          'Zapłacono': Number(row.total_paid).toFixed(2),
          'Liczba faktur': row.invoice_count,
        }))
      );
      XLSX.utils.book_append_sheet(workbook, clientSheet, 'Przychody wg klientow');
    }

    // Sheet 3: Status Distribution
    if (data.statusDistribution.length > 0) {
      const statusLabels: Record<string, string> = {
        draft: 'Szkic',
        pending: 'Oczekująca',
        sent: 'Wysłana',
        paid: 'Opłacona',
        partially_paid: 'Częściowo opłacona',
        overdue: 'Przeterminowana',
        cancelled: 'Anulowana',
      };

      const statusSheet = XLSX.utils.json_to_sheet(
        data.statusDistribution.map((row) => ({
          Status: statusLabels[row.status] || row.status,
          'Liczba faktur': row.count,
          'Kwota brutto': Number(row.total_gross).toFixed(2),
        }))
      );
      XLSX.utils.book_append_sheet(workbook, statusSheet, 'Rozkład statusów');
    }

    // Sheet 4: Payment Overview
    if (data.paymentOverview) {
      const overviewData = [
        { Metryka: 'Łączna liczba faktur', Wartość: data.paymentOverview.total_invoices },
        {
          Metryka: 'Łączna kwota brutto',
          Wartość: Number(data.paymentOverview.total_gross).toFixed(2),
        },
        { Metryka: 'Łącznie zapłacono', Wartość: Number(data.paymentOverview.total_paid).toFixed(2) },
        {
          Metryka: 'Łącznie do zapłaty',
          Wartość: Number(data.paymentOverview.total_pending).toFixed(2),
        },
        { Metryka: 'Procent opłaconych', Wartość: `${data.paymentOverview.paid_percentage}%` },
        { Metryka: 'Liczba przeterminowanych', Wartość: data.paymentOverview.overdue_count },
        {
          Metryka: 'Kwota przeterminowana',
          Wartość: Number(data.paymentOverview.overdue_amount).toFixed(2),
        },
      ];
      const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
      XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Podsumowanie płatności');
    }

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Generate PDF report with financial data
   */
  async generatePdfReport(filters: ReportFilters): Promise<Buffer> {
    const data = await this.fetchReportData(filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register font for Polish characters
      if (fs.existsSync(this.fontPath)) {
        doc.registerFont('DejaVu', this.fontPath);
        doc.font('DejaVu');
      }

      // Title
      doc.fontSize(20).text('Raport finansowy', { align: 'center' });
      doc.moveDown();

      // Date range
      const dateRange = this.formatDateRange(filters);
      doc.fontSize(12).text(`Okres: ${dateRange}`, { align: 'center' });
      doc.moveDown(2);

      // Payment Overview Section
      if (data.paymentOverview) {
        doc.fontSize(14).text('Podsumowanie płatności', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        const overview = data.paymentOverview;
        doc.text(`Łączna liczba faktur: ${overview.total_invoices}`);
        doc.text(`Łączna kwota brutto: ${this.formatMoney(overview.total_gross)} PLN`);
        doc.text(`Łącznie zapłacono: ${this.formatMoney(overview.total_paid)} PLN`);
        doc.text(`Łącznie do zapłaty: ${this.formatMoney(overview.total_pending)} PLN`);
        doc.text(`Procent opłaconych: ${overview.paid_percentage}%`);
        doc.text(`Faktury przeterminowane: ${overview.overdue_count}`);
        doc.text(`Kwota przeterminowana: ${this.formatMoney(overview.overdue_amount)} PLN`);
        doc.moveDown(2);
      }

      // Status Distribution Section
      if (data.statusDistribution.length > 0) {
        doc.fontSize(14).text('Rozkład statusów faktur', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        const statusLabels: Record<string, string> = {
          draft: 'Szkic',
          pending: 'Oczekująca',
          sent: 'Wysłana',
          paid: 'Opłacona',
          partially_paid: 'Częściowo opłacona',
          overdue: 'Przeterminowana',
          cancelled: 'Anulowana',
        };

        data.statusDistribution.forEach((row) => {
          const label = statusLabels[row.status] || row.status;
          doc.text(
            `${label}: ${row.count} faktur, kwota: ${this.formatMoney(row.total_gross)} PLN`
          );
        });
        doc.moveDown(2);
      }

      // Top Clients Section
      if (data.revenueByClient.length > 0) {
        doc.fontSize(14).text('Top 10 klientów wg przychodów', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        data.revenueByClient.slice(0, 10).forEach((row, index) => {
          doc.text(
            `${index + 1}. ${row.client_name}: ${this.formatMoney(row.total_gross)} PLN (${row.invoice_count} faktur)`
          );
        });
        doc.moveDown(2);
      }

      // Revenue Over Time Section (summary)
      if (data.revenueOverTime.length > 0) {
        doc.fontSize(14).text('Przychody w czasie', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);

        // Show last 12 periods
        const periods = data.revenueOverTime.slice(-12);
        periods.forEach((row) => {
          doc.text(
            `${row.period}: brutto ${this.formatMoney(row.gross_total)} PLN, zapłacono ${this.formatMoney(row.paid_amount)} PLN`
          );
        });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, {
        align: 'right',
      });

      doc.end();
    });
  }

  /**
   * Fetch all report data
   */
  private async fetchReportData(filters: ReportFilters): Promise<ExportData> {
    const [revenueOverTime, revenueByClient, statusDistribution, paymentOverview] =
      await Promise.all([
        invoiceService.getRevenueOverTime({ ...filters, period: 'monthly' }),
        invoiceService.getRevenueByClient({ ...filters, limit: 20 }),
        invoiceService.getStatusDistribution(filters),
        invoiceService.getPaymentOverview(filters),
      ]);

    return {
      revenueOverTime,
      revenueByClient,
      statusDistribution,
      paymentOverview,
    };
  }

  /**
   * Format date range for display
   */
  private formatDateRange(filters: ReportFilters): string {
    const formatDate = (date: Date) => date.toLocaleDateString('pl-PL');

    if (filters.start_date && filters.end_date) {
      return `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`;
    } else if (filters.start_date) {
      return `od ${formatDate(filters.start_date)}`;
    } else if (filters.end_date) {
      return `do ${formatDate(filters.end_date)}`;
    }
    return 'Cały okres';
  }

  /**
   * Format money for display
   */
  private formatMoney(amount: number | string): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

export default new InvoiceReportService();
