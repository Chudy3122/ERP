import { Request, Response } from 'express';
import paymentService from '../services/payment.service';

export class PaymentController {
  /**
   * Create new payment
   * POST /api/payments
   */
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const payment = await paymentService.createPayment(req.body, userId);
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get payment by ID
   * GET /api/payments/:id
   */
  async getPaymentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id);
      res.json(payment);
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * Get payments for an invoice
   * GET /api/payments/invoice/:invoiceId
   */
  async getPaymentsByInvoice(req: Request, res: Response): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const payments = await paymentService.getPaymentsByInvoice(invoiceId);
      res.json(payments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Update payment
   * PUT /api/payments/:id
   */
  async updatePayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const payment = await paymentService.updatePayment(id, req.body, userId);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Delete payment
   * DELETE /api/payments/:id
   */
  async deletePayment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      await paymentService.deletePayment(id, userId);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * Get overdue invoices
   * GET /api/payments/overdue
   */
  async getOverdueInvoices(req: Request, res: Response): Promise<void> {
    try {
      const overdueInvoices = await paymentService.getOverdueInvoices();
      res.json(overdueInvoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Send overdue reminders
   * POST /api/payments/send-reminders
   */
  async sendOverdueReminders(req: Request, res: Response): Promise<void> {
    try {
      const remindersSent = await paymentService.sendOverdueReminders();
      res.json({ message: `Wysłano ${remindersSent} przypomnień`, count: remindersSent });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * Get payment statistics
   * GET /api/payments/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
      };

      const stats = await paymentService.getPaymentStatistics(filters);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new PaymentController();
