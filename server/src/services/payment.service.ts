import { AppDataSource } from '../config/database';
import { Payment, PaymentMethod } from '../models/Payment.model';
import { Invoice, InvoiceStatus } from '../models/Invoice.model';
import { User } from '../models/User.model';
import { LessThan, In } from 'typeorm';
import activityService from './activity.service';
import notificationService from './notification.service';
import { NotificationType, NotificationPriority } from '../models/Notification.model';

interface CreatePaymentDto {
  invoice_id: string;
  amount: number;
  payment_date: Date;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

interface UpdatePaymentDto {
  amount?: number;
  payment_date?: Date;
  payment_method?: PaymentMethod;
  reference_number?: string;
  notes?: string;
}

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  client_id: string;
  client?: any;
  gross_total: number;
  paid_amount: number;
  due_date: Date;
  currency: string;
  days_overdue: number;
  remaining_amount: number;
}

export class PaymentService {
  private paymentRepository = AppDataSource.getRepository(Payment);
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new payment
   */
  async createPayment(data: CreatePaymentDto, userId: string): Promise<Payment> {
    // Verify invoice exists
    const invoice = await this.invoiceRepository.findOne({
      where: { id: data.invoice_id },
      relations: ['client'],
    });

    if (!invoice) {
      throw new Error('Faktura nie znaleziona');
    }

    // Don't allow payments on cancelled invoices
    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można dodać płatności do anulowanej faktury');
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Kwota płatności musi być większa niż 0');
    }

    const payment = this.paymentRepository.create({
      invoice_id: data.invoice_id,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_method: data.payment_method || PaymentMethod.BANK_TRANSFER,
      reference_number: data.reference_number,
      notes: data.notes,
      created_by: userId,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // Update invoice paid_amount and status
    await this.recalculateInvoicePaidAmount(data.invoice_id);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'recorded_payment',
        'payment',
        savedPayment.id,
        `${user.first_name} ${user.last_name} zarejestrował płatność ${data.amount} PLN dla faktury ${invoice.invoice_number}`,
        {
          invoice_number: invoice.invoice_number,
          amount: data.amount,
          payment_method: data.payment_method || PaymentMethod.BANK_TRANSFER,
        }
      );
    }

    return await this.getPaymentById(savedPayment.id);
  }

  /**
   * Recalculate invoice paid_amount from all payments
   */
  async recalculateInvoicePaidAmount(invoiceId: string): Promise<void> {
    const payments = await this.paymentRepository.find({
      where: { invoice_id: invoiceId },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    invoice.paid_amount = Math.round(totalPaid * 100) / 100;

    // Update status based on paid amount
    if (invoice.status !== InvoiceStatus.CANCELLED) {
      if (totalPaid >= Number(invoice.gross_total)) {
        invoice.status = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        invoice.status = InvoiceStatus.PARTIALLY_PAID;
      } else if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_PAID) {
        // If all payments removed, check if overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(invoice.due_date) < today) {
          invoice.status = InvoiceStatus.OVERDUE;
        } else {
          invoice.status = InvoiceStatus.SENT;
        }
      }
    }

    await this.invoiceRepository.save(invoice);
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['invoice', 'invoice.client', 'creator'],
    });

    if (!payment) {
      throw new Error('Płatność nie znaleziona');
    }

    return payment;
  }

  /**
   * Get payments for an invoice
   */
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { invoice_id: invoiceId },
      relations: ['creator'],
      order: { payment_date: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * Update payment
   */
  async updatePayment(id: string, data: UpdatePaymentDto, userId: string): Promise<Payment> {
    const payment = await this.getPaymentById(id);

    // Don't allow editing payments on paid or cancelled invoices
    if (payment.invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można edytować płatności anulowanej faktury');
    }

    Object.assign(payment, data);
    await this.paymentRepository.save(payment);

    // Recalculate invoice
    await this.recalculateInvoicePaidAmount(payment.invoice_id);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_payment',
        'payment',
        payment.id,
        `${user.first_name} ${user.last_name} zaktualizował płatność dla faktury ${payment.invoice.invoice_number}`,
        { changes: data }
      );
    }

    return await this.getPaymentById(id);
  }

  /**
   * Delete payment
   */
  async deletePayment(id: string, userId: string): Promise<void> {
    const payment = await this.getPaymentById(id);

    // Don't allow deleting payments on cancelled invoices
    if (payment.invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można usunąć płatności anulowanej faktury');
    }

    const invoiceId = payment.invoice_id;
    const invoiceNumber = payment.invoice.invoice_number;
    const amount = payment.amount;

    await this.paymentRepository.remove(payment);

    // Recalculate invoice
    await this.recalculateInvoicePaidAmount(invoiceId);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_payment',
        'payment',
        null,
        `${user.first_name} ${user.last_name} usunął płatność ${amount} PLN z faktury ${invoiceNumber}`,
        { invoice_number: invoiceNumber, amount }
      );
    }
  }

  /**
   * Get overdue invoices with days overdue
   */
  async getOverdueInvoices(): Promise<OverdueInvoice[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await this.invoiceRepository.find({
      where: [
        { status: InvoiceStatus.OVERDUE },
        { status: InvoiceStatus.SENT, due_date: LessThan(today) },
        { status: InvoiceStatus.PARTIALLY_PAID, due_date: LessThan(today) },
      ],
      relations: ['client', 'creator'],
      order: { due_date: 'ASC' },
    });

    return invoices.map((invoice) => {
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - dueDate.getTime();
      const days_overdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const remaining_amount = Number(invoice.gross_total) - Number(invoice.paid_amount);

      return {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        client_id: invoice.client_id,
        client: invoice.client,
        gross_total: Number(invoice.gross_total),
        paid_amount: Number(invoice.paid_amount),
        due_date: invoice.due_date,
        currency: invoice.currency,
        days_overdue,
        remaining_amount: Math.round(remaining_amount * 100) / 100,
      };
    });
  }

  /**
   * Send overdue reminders to admin/accounting users
   */
  async sendOverdueReminders(): Promise<number> {
    const overdueInvoices = await this.getOverdueInvoices();

    if (overdueInvoices.length === 0) {
      return 0;
    }

    // Get admin and accounting users
    const admins = await this.userRepository.find({
      where: { role: In(['admin', 'ksiegowosc']) },
    });

    let remindersSent = 0;

    for (const invoice of overdueInvoices) {
      for (const admin of admins) {
        try {
          await notificationService.createNotification({
            userId: admin.id,
            type: NotificationType.INVOICE_OVERDUE,
            title: 'Przeterminowana faktura',
            message: `Faktura ${invoice.invoice_number} dla ${invoice.client?.name || 'Nieznany'} jest przeterminowana o ${invoice.days_overdue} dni. Pozostało do zapłaty: ${invoice.remaining_amount} ${invoice.currency}`,
            priority: invoice.days_overdue > 30 ? NotificationPriority.URGENT : NotificationPriority.HIGH,
            relatedEntityType: 'invoice',
            relatedEntityId: invoice.id,
            actionUrl: `/invoices/${invoice.id}`,
            data: {
              invoice_number: invoice.invoice_number,
              client_name: invoice.client?.name,
              days_overdue: invoice.days_overdue,
              remaining_amount: invoice.remaining_amount,
              currency: invoice.currency,
            },
          });
          remindersSent++;
        } catch (error) {
          console.error(`Failed to send reminder for invoice ${invoice.id}:`, error);
        }
      }
    }

    return remindersSent;
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics(filters?: { start_date?: Date; end_date?: Date }): Promise<{
    total_payments: number;
    total_amount: number;
    by_method: { method: PaymentMethod; count: number; amount: number }[];
  }> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment');

    if (filters?.start_date) {
      queryBuilder.andWhere('payment.payment_date >= :startDate', { startDate: filters.start_date });
    }

    if (filters?.end_date) {
      queryBuilder.andWhere('payment.payment_date <= :endDate', { endDate: filters.end_date });
    }

    const payments = await queryBuilder.getMany();

    const byMethod: { [key in PaymentMethod]?: { count: number; amount: number } } = {};

    for (const payment of payments) {
      if (!byMethod[payment.payment_method]) {
        byMethod[payment.payment_method] = { count: 0, amount: 0 };
      }
      byMethod[payment.payment_method]!.count++;
      byMethod[payment.payment_method]!.amount += Number(payment.amount);
    }

    return {
      total_payments: payments.length,
      total_amount: payments.reduce((sum, p) => sum + Number(p.amount), 0),
      by_method: Object.entries(byMethod).map(([method, stats]) => ({
        method: method as PaymentMethod,
        count: stats.count,
        amount: Math.round(stats.amount * 100) / 100,
      })),
    };
  }
}

export default new PaymentService();
