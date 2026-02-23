import { Request, Response } from 'express';
import invoiceService from '../services/invoice.service';
import invoicePdfService from '../services/invoicePdf.service';
import invoiceReportService from '../services/invoiceReport.service';
import { InvoiceStatus } from '../models/Invoice.model';

export class InvoiceController {
  /**
   * Create new invoice
   * POST /api/invoices
   */
  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const invoice = await invoiceService.createInvoice(req.body, userId);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get all invoices with filters
   * GET /api/invoices
   */
  async getAllInvoices(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        status: req.query.status as InvoiceStatus,
        client_id: req.query.client_id as string,
        project_id: req.query.project_id as string,
        search: req.query.search as string,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const result = await invoiceService.getAllInvoices(filters);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get invoice statistics
   * GET /api/invoices/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const stats = await invoiceService.getStatistics(filters);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get invoice by ID
   * GET /api/invoices/:id
   */
  async getInvoiceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const invoice = await invoiceService.getInvoiceById(id);
      res.json(invoice);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Update invoice
   * PUT /api/invoices/:id
   */
  async updateInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const invoice = await invoiceService.updateInvoice(id, req.body, userId);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete invoice
   * DELETE /api/invoices/:id
   */
  async deleteInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await invoiceService.deleteInvoice(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update invoice status
   * PATCH /api/invoices/:id/status
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.userId;

      if (!status || !Object.values(InvoiceStatus).includes(status)) {
        res.status(400).json({ message: 'Nieprawidłowy status' });
        return;
      }

      const invoice = await invoiceService.updateStatus(id, status, userId);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Mark invoice as paid
   * POST /api/invoices/:id/mark-paid
   */
  async markAsPaid(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { paid_amount } = req.body;
      const userId = req.user!.userId;

      const invoice = await invoiceService.markAsPaid(id, paid_amount, userId);
      res.json(invoice);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ==================== INVOICE ITEMS ====================

  /**
   * Get invoice items
   * GET /api/invoices/:id/items
   */
  async getInvoiceItems(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const items = await invoiceService.getInvoiceItems(id);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Add item to invoice
   * POST /api/invoices/:id/items
   */
  async addItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const item = await invoiceService.addItem(id, req.body);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Update invoice item
   * PUT /api/invoices/:id/items/:itemId
   */
  async updateItem(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      const item = await invoiceService.updateItem(itemId, req.body);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Remove invoice item
   * DELETE /api/invoices/:id/items/:itemId
   */
  async removeItem(req: Request, res: Response): Promise<void> {
    try {
      const { itemId } = req.params;
      await invoiceService.removeItem(itemId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // ==================== PDF ====================

  /**
   * Download invoice as PDF
   * GET /api/invoices/:id/pdf
   */
  async downloadPdf(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      console.log('[PDF] Generating PDF for invoice:', id);

      const invoice = await invoiceService.getInvoiceById(id);
      console.log('[PDF] Invoice found:', invoice.invoice_number);

      const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);
      console.log('[PDF] PDF generated, size:', pdfBuffer.length);

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${invoice.invoice_number.replace(/\//g, '-')}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error: any) {
      console.error('[PDF] Error generating PDF:', error);
      res.status(400).json({ message: error.message });
    }
  }

  // ==================== REPORTS ====================

  /**
   * Get revenue over time
   * GET /api/invoices/reports/revenue-over-time
   */
  async getRevenueOverTime(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        period: (req.query.period as 'daily' | 'weekly' | 'monthly') || 'monthly',
      };

      const data = await invoiceService.getRevenueOverTime(filters);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get revenue by client
   * GET /api/invoices/reports/revenue-by-client
   */
  async getRevenueByClient(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      };

      const data = await invoiceService.getRevenueByClient(filters);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get invoice status distribution
   * GET /api/invoices/reports/status-distribution
   */
  async getStatusDistribution(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const data = await invoiceService.getStatusDistribution(filters);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get payment overview
   * GET /api/invoices/reports/payment-overview
   */
  async getPaymentOverview(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const data = await invoiceService.getPaymentOverview(filters);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Export report as Excel
   * GET /api/invoices/reports/export/excel
   */
  async exportExcel(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const buffer = await invoiceReportService.generateExcelReport(filters);

      const filename = `raport-finansowy-${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error: any) {
      console.error('[Export Excel] Error:', error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Export report as PDF
   * GET /api/invoices/reports/export/pdf
   */
  async exportPdf(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const buffer = await invoiceReportService.generatePdfReport(filters);

      const filename = `raport-finansowy-${new Date().toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error: any) {
      console.error('[Export PDF] Error:', error);
      res.status(500).json({ message: error.message });
    }
  }
}

export default new InvoiceController();
