import { Request, Response } from 'express';
import reportService, { ReportFilters } from '../services/report.service';
import { TimeEntryStatus } from '../models/TimeEntry.model';

export class ReportController {
  /**
   * Get time report data
   * GET /api/reports/time?startDate=...&endDate=...&userId=...&status=...
   */
  async getTimeReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userId, status } = req.query;

      const filters: ReportFilters = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
        userId: userId as string,
        status: status as TimeEntryStatus,
      };

      const reportData = await reportService.getTimeReportData(filters);

      res.status(200).json({
        success: true,
        data: reportData,
      });
    } catch (error: any) {
      console.error('Get time report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate time report',
      });
    }
  }

  /**
   * Export time report to Excel
   * GET /api/reports/time/export/excel?startDate=...&endDate=...&userId=...&status=...
   */
  async exportTimeReportExcel(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userId, status } = req.query;

      const filters: ReportFilters = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
        userId: userId as string,
        status: status as TimeEntryStatus,
      };

      const buffer = await reportService.generateExcelReport(filters);

      const filename = `raport_czasu_pracy_${filters.startDate.toISOString().split('T')[0]}_${filters.endDate.toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export Excel report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export Excel report',
      });
    }
  }

  /**
   * Export time report to PDF
   * GET /api/reports/time/export/pdf?startDate=...&endDate=...&userId=...&status=...
   */
  async exportTimeReportPDF(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, userId, status } = req.query;

      const filters: ReportFilters = {
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
        userId: userId as string,
        status: status as TimeEntryStatus,
      };

      const buffer = await reportService.generatePDFReport(filters);

      const filename = `raport_czasu_pracy_${filters.startDate.toISOString().split('T')[0]}_${filters.endDate.toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error('Export PDF report error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to export PDF report',
      });
    }
  }
}

export default new ReportController();
