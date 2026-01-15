import { AppDataSource } from '../config/database';
import { TimeEntry, TimeEntryStatus } from '../models/TimeEntry.model';
import { User } from '../models/User.model';
import { LeaveRequest, LeaveStatus } from '../models/LeaveRequest.model';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  userId?: string;
  status?: TimeEntryStatus;
}

export interface TimeReportData {
  entries: TimeEntry[];
  summary: {
    totalHours: number;
    totalMinutes: number;
    overtimeHours: number;
    overtimeMinutes: number;
    lateArrivals: number;
    totalLateMinutes: number;
    daysWorked: number;
    averageHoursPerDay: number;
  };
}

export class ReportService {
  private timeEntryRepository = AppDataSource.getRepository(TimeEntry);
  private userRepository = AppDataSource.getRepository(User);
  private leaveRepository = AppDataSource.getRepository(LeaveRequest);

  /**
   * Get time report data with filters
   */
  async getTimeReportData(filters: ReportFilters): Promise<TimeReportData> {
    const queryBuilder = this.timeEntryRepository
      .createQueryBuilder('timeEntry')
      .leftJoinAndSelect('timeEntry.user', 'user')
      .where('timeEntry.clock_in >= :startDate', { startDate: filters.startDate })
      .andWhere('timeEntry.clock_in <= :endDate', { endDate: filters.endDate });

    if (filters.userId) {
      queryBuilder.andWhere('timeEntry.user_id = :userId', { userId: filters.userId });
    }

    if (filters.status) {
      queryBuilder.andWhere('timeEntry.status = :status', { status: filters.status });
    }

    queryBuilder.orderBy('timeEntry.clock_in', 'DESC');

    const entries = await queryBuilder.getMany();

    // Calculate summary
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    let lateArrivals = 0;
    let totalLateMinutes = 0;
    const uniqueDays = new Set<string>();

    entries.forEach((entry) => {
      if (entry.duration_minutes) {
        totalMinutes += entry.duration_minutes;
      }
      if (entry.overtime_minutes) {
        overtimeMinutes += entry.overtime_minutes;
      }
      if (entry.is_late) {
        lateArrivals++;
        totalLateMinutes += entry.late_minutes;
      }
      const dateKey = new Date(entry.clock_in).toISOString().split('T')[0];
      uniqueDays.add(dateKey);
    });

    const daysWorked = uniqueDays.size;
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;
    const averageHoursPerDay = daysWorked > 0 ? totalMinutes / 60 / daysWorked : 0;

    return {
      entries,
      summary: {
        totalHours,
        totalMinutes: totalMins,
        overtimeHours,
        overtimeMinutes: overtimeMins,
        lateArrivals,
        totalLateMinutes,
        daysWorked,
        averageHoursPerDay,
      },
    };
  }

  /**
   * Generate Excel report
   */
  async generateExcelReport(filters: ReportFilters): Promise<Buffer> {
    const reportData = await this.getTimeReportData(filters);

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Time entries sheet
    const entriesData = reportData.entries.map((entry) => ({
      'Data': new Date(entry.clock_in).toLocaleDateString('pl-PL'),
      'Pracownik': entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : 'N/A',
      'Wejście': new Date(entry.clock_in).toLocaleTimeString('pl-PL'),
      'Wyjście': entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('pl-PL') : '-',
      'Czas pracy (min)': entry.duration_minutes || 0,
      'Nadgodziny (min)': entry.overtime_minutes || 0,
      'Spóźnienie (min)': entry.late_minutes || 0,
      'Status': this.translateStatus(entry.status),
      'Notatki': entry.notes || '',
    }));

    const entriesSheet = XLSX.utils.json_to_sheet(entriesData);
    XLSX.utils.book_append_sheet(workbook, entriesSheet, 'Wpisy czasu pracy');

    // Summary sheet
    const summaryData = [
      { 'Metryka': 'Łączny czas pracy', 'Wartość': `${reportData.summary.totalHours}h ${reportData.summary.totalMinutes}m` },
      { 'Metryka': 'Nadgodziny', 'Wartość': `${reportData.summary.overtimeHours}h ${reportData.summary.overtimeMinutes}m` },
      { 'Metryka': 'Liczba spóźnień', 'Wartość': reportData.summary.lateArrivals },
      { 'Metryka': 'Łączny czas spóźnień', 'Wartość': `${reportData.summary.totalLateMinutes} min` },
      { 'Metryka': 'Dni przepracowane', 'Wartość': reportData.summary.daysWorked },
      { 'Metryka': 'Średnia dzienna', 'Wartość': `${reportData.summary.averageHoursPerDay.toFixed(2)}h` },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Podsumowanie');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * Generate PDF report
   */
  async generatePDFReport(filters: ReportFilters): Promise<Buffer> {
    const reportData = await this.getTimeReportData(filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text('Raport Czasu Pracy', { align: 'center' });
      doc.moveDown();

      // Report period
      doc.fontSize(12).text(
        `Okres: ${filters.startDate.toLocaleDateString('pl-PL')} - ${filters.endDate.toLocaleDateString('pl-PL')}`,
        { align: 'center' }
      );
      doc.moveDown(2);

      // Summary section
      doc.fontSize(16).text('Podsumowanie', { underline: true });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Łączny czas pracy: ${reportData.summary.totalHours}h ${reportData.summary.totalMinutes}m`);
      doc.text(`Nadgodziny: ${reportData.summary.overtimeHours}h ${reportData.summary.overtimeMinutes}m`);
      doc.text(`Liczba spóźnień: ${reportData.summary.lateArrivals}`);
      doc.text(`Łączny czas spóźnień: ${reportData.summary.totalLateMinutes} min`);
      doc.text(`Dni przepracowane: ${reportData.summary.daysWorked}`);
      doc.text(`Średnia dzienna: ${reportData.summary.averageHoursPerDay.toFixed(2)}h`);
      doc.moveDown(2);

      // Time entries table
      doc.fontSize(16).text('Szczegóły wpisów', { underline: true });
      doc.moveDown();

      // Table header
      doc.fontSize(9);
      const tableTop = doc.y;
      const colWidths = { date: 70, employee: 100, in: 50, out: 50, duration: 60, overtime: 60, late: 50, status: 70 };
      let xPos = 50;

      doc.text('Data', xPos, tableTop, { width: colWidths.date });
      xPos += colWidths.date;
      doc.text('Pracownik', xPos, tableTop, { width: colWidths.employee });
      xPos += colWidths.employee;
      doc.text('Wejście', xPos, tableTop, { width: colWidths.in });
      xPos += colWidths.in;
      doc.text('Wyjście', xPos, tableTop, { width: colWidths.out });
      xPos += colWidths.out;
      doc.text('Czas (min)', xPos, tableTop, { width: colWidths.duration });
      xPos += colWidths.duration;
      doc.text('Nadg. (min)', xPos, tableTop, { width: colWidths.overtime });
      xPos += colWidths.overtime;
      doc.text('Spóź.', xPos, tableTop, { width: colWidths.late });
      xPos += colWidths.late;
      doc.text('Status', xPos, tableTop, { width: colWidths.status });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // Table rows (limited to first 50 entries for PDF)
      const entriesToShow = reportData.entries.slice(0, 50);
      entriesToShow.forEach((entry, index) => {
        if (doc.y > 700) {
          doc.addPage();
          doc.fontSize(9);
        }

        xPos = 50;
        const yPos = doc.y;

        doc.text(new Date(entry.clock_in).toLocaleDateString('pl-PL'), xPos, yPos, { width: colWidths.date });
        xPos += colWidths.date;
        doc.text(
          entry.user ? `${entry.user.first_name} ${entry.user.last_name}` : 'N/A',
          xPos,
          yPos,
          { width: colWidths.employee }
        );
        xPos += colWidths.employee;
        doc.text(new Date(entry.clock_in).toLocaleTimeString('pl-PL'), xPos, yPos, { width: colWidths.in });
        xPos += colWidths.in;
        doc.text(
          entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('pl-PL') : '-',
          xPos,
          yPos,
          { width: colWidths.out }
        );
        xPos += colWidths.out;
        doc.text((entry.duration_minutes || 0).toString(), xPos, yPos, { width: colWidths.duration });
        xPos += colWidths.duration;
        doc.text((entry.overtime_minutes || 0).toString(), xPos, yPos, { width: colWidths.overtime });
        xPos += colWidths.overtime;
        doc.text((entry.late_minutes || 0).toString(), xPos, yPos, { width: colWidths.late });
        xPos += colWidths.late;
        doc.text(this.translateStatus(entry.status), xPos, yPos, { width: colWidths.status });

        doc.moveDown();
      });

      if (reportData.entries.length > 50) {
        doc.moveDown();
        doc.text(`... i ${reportData.entries.length - 50} więcej wpisów`, { align: 'center' });
      }

      // Footer
      doc.fontSize(8).text(
        `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * Translate status to Polish
   */
  private translateStatus(status: TimeEntryStatus): string {
    const translations = {
      [TimeEntryStatus.IN_PROGRESS]: 'W trakcie',
      [TimeEntryStatus.COMPLETED]: 'Ukończony',
      [TimeEntryStatus.APPROVED]: 'Zatwierdzony',
      [TimeEntryStatus.REJECTED]: 'Odrzucony',
    };
    return translations[status] || status;
  }
}

export default new ReportService();
