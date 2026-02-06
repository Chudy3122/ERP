import { AppDataSource } from '../config/database';
import { Invoice, InvoiceStatus } from '../models/Invoice.model';
import { InvoiceItem } from '../models/InvoiceItem.model';
import { Client } from '../models/Client.model';
import { User } from '../models/User.model';
import activityService from './activity.service';
import { Between, LessThan } from 'typeorm';

interface CreateInvoiceDto {
  client_id: string;
  project_id?: string;
  issue_date: Date;
  sale_date?: Date;
  due_date: Date;
  payment_terms?: string;
  currency?: string;
  notes?: string;
  internal_notes?: string;
  items?: CreateInvoiceItemDto[];
}

interface UpdateInvoiceDto {
  client_id?: string;
  project_id?: string;
  issue_date?: Date;
  sale_date?: Date;
  due_date?: Date;
  payment_terms?: string;
  currency?: string;
  notes?: string;
  internal_notes?: string;
  status?: InvoiceStatus;
}

interface CreateInvoiceItemDto {
  description: string;
  quantity: number;
  unit?: string;
  unit_price_net: number;
  vat_rate?: number;
}

interface UpdateInvoiceItemDto {
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price_net?: number;
  vat_rate?: number;
  position?: number;
}

interface InvoiceFilters {
  status?: InvoiceStatus;
  client_id?: string;
  project_id?: string;
  search?: string;
  start_date?: Date;
  end_date?: Date;
}

interface InvoiceStatistics {
  total_count: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  partially_paid_count: number;
  overdue_count: number;
  cancelled_count: number;
  total_net: number;
  total_gross: number;
  total_paid: number;
  total_pending: number;
}

export class InvoiceService {
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private invoiceItemRepository = AppDataSource.getRepository(InvoiceItem);
  private clientRepository = AppDataSource.getRepository(Client);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generate invoice number
   * Format: FV/YYYY/MM/NNNN
   */
  async generateInvoiceNumber(issueDate: Date): Promise<string> {
    const year = issueDate.getFullYear();
    const month = String(issueDate.getMonth() + 1).padStart(2, '0');

    // Get count of invoices in this month
    const startOfMonth = new Date(year, issueDate.getMonth(), 1);
    const endOfMonth = new Date(year, issueDate.getMonth() + 1, 0, 23, 59, 59);

    const count = await this.invoiceRepository.count({
      where: {
        issue_date: Between(startOfMonth, endOfMonth),
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `FV/${year}/${month}/${sequence}`;
  }

  /**
   * Calculate item amounts
   */
  private calculateItemAmounts(item: CreateInvoiceItemDto | UpdateInvoiceItemDto): {
    net_amount: number;
    vat_amount: number;
    gross_amount: number;
  } {
    const quantity = item.quantity || 1;
    const unitPriceNet = item.unit_price_net || 0;
    const vatRate = item.vat_rate !== undefined ? item.vat_rate : 23;

    const net_amount = Math.round(quantity * unitPriceNet * 100) / 100;
    const vat_amount = Math.round(net_amount * (vatRate / 100) * 100) / 100;
    const gross_amount = Math.round((net_amount + vat_amount) * 100) / 100;

    return { net_amount, vat_amount, gross_amount };
  }

  /**
   * Recalculate invoice totals
   */
  async recalculateTotals(invoiceId: string): Promise<Invoice> {
    const items = await this.invoiceItemRepository.find({
      where: { invoice_id: invoiceId },
    });

    let net_total = 0;
    let vat_total = 0;
    let gross_total = 0;

    for (const item of items) {
      net_total += Number(item.net_amount);
      vat_total += Number(item.vat_amount);
      gross_total += Number(item.gross_amount);
    }

    await this.invoiceRepository.update(invoiceId, {
      net_total: Math.round(net_total * 100) / 100,
      vat_total: Math.round(vat_total * 100) / 100,
      gross_total: Math.round(gross_total * 100) / 100,
    });

    return await this.getInvoiceById(invoiceId);
  }

  /**
   * Create a new invoice
   */
  async createInvoice(data: CreateInvoiceDto, userId: string): Promise<Invoice> {
    // Verify client exists
    const client = await this.clientRepository.findOne({
      where: { id: data.client_id },
    });

    if (!client) {
      throw new Error('Kontrahent nie znaleziony');
    }

    // Generate invoice number
    const invoice_number = await this.generateInvoiceNumber(new Date(data.issue_date));

    const invoice = this.invoiceRepository.create({
      invoice_number,
      client_id: data.client_id,
      project_id: data.project_id,
      issue_date: data.issue_date,
      sale_date: data.sale_date,
      due_date: data.due_date,
      payment_terms: data.payment_terms,
      currency: data.currency || 'PLN',
      notes: data.notes,
      internal_notes: data.internal_notes,
      created_by: userId,
      status: InvoiceStatus.DRAFT,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create items if provided
    if (data.items && data.items.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        await this.addItem(savedInvoice.id, data.items[i], i + 1);
      }
      // Recalculate totals after adding items
      await this.recalculateTotals(savedInvoice.id);
    }

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'created_invoice',
        'invoice',
        savedInvoice.id,
        `${user.first_name} ${user.last_name} utworzył fakturę ${savedInvoice.invoice_number}`,
        { invoice_number: savedInvoice.invoice_number, client_name: client.name }
      );
    }

    return await this.getInvoiceById(savedInvoice.id);
  }

  /**
   * Get all invoices with filters
   */
  async getAllInvoices(filters?: InvoiceFilters): Promise<{ invoices: Invoice[]; total: number }> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.client', 'client')
      .leftJoinAndSelect('invoice.project', 'project')
      .leftJoinAndSelect('invoice.creator', 'creator')
      .orderBy('invoice.issue_date', 'DESC')
      .addOrderBy('invoice.invoice_number', 'DESC');

    if (filters) {
      if (filters.status) {
        queryBuilder.andWhere('invoice.status = :status', { status: filters.status });
      }

      if (filters.client_id) {
        queryBuilder.andWhere('invoice.client_id = :clientId', { clientId: filters.client_id });
      }

      if (filters.project_id) {
        queryBuilder.andWhere('invoice.project_id = :projectId', { projectId: filters.project_id });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(invoice.invoice_number ILIKE :search OR client.name ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      if (filters.start_date) {
        queryBuilder.andWhere('invoice.issue_date >= :startDate', { startDate: filters.start_date });
      }

      if (filters.end_date) {
        queryBuilder.andWhere('invoice.issue_date <= :endDate', { endDate: filters.end_date });
      }
    }

    const [invoices, total] = await queryBuilder.getManyAndCount();

    return { invoices, total };
  }

  /**
   * Get invoice by ID with items
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['client', 'project', 'creator', 'items'],
    });

    if (!invoice) {
      throw new Error('Faktura nie znaleziona');
    }

    // Sort items by position
    if (invoice.items) {
      invoice.items.sort((a, b) => a.position - b.position);
    }

    return invoice;
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, data: UpdateInvoiceDto, userId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);

    // Don't allow editing paid or cancelled invoices
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można edytować opłaconej lub anulowanej faktury');
    }

    Object.assign(invoice, data);
    await this.invoiceRepository.save(invoice);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_invoice',
        'invoice',
        invoice.id,
        `${user.first_name} ${user.last_name} zaktualizował fakturę ${invoice.invoice_number}`,
        { changes: data }
      );
    }

    return await this.getInvoiceById(id);
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(id: string, userId: string): Promise<void> {
    const invoice = await this.getInvoiceById(id);

    // Don't allow deleting paid invoices
    if (invoice.status === InvoiceStatus.PAID) {
      throw new Error('Nie można usunąć opłaconej faktury');
    }

    const invoiceNumber = invoice.invoice_number;
    await this.invoiceRepository.remove(invoice);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'deleted_invoice',
        'invoice',
        null,
        `${user.first_name} ${user.last_name} usunął fakturę ${invoiceNumber}`,
        { invoice_number: invoiceNumber }
      );
    }
  }

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: InvoiceStatus, userId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);
    const oldStatus = invoice.status;

    invoice.status = status;

    // If marking as paid, set paid_amount to gross_total
    if (status === InvoiceStatus.PAID) {
      invoice.paid_amount = invoice.gross_total;
    }

    await this.invoiceRepository.save(invoice);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'updated_invoice_status',
        'invoice',
        invoice.id,
        `${user.first_name} ${user.last_name} zmienił status faktury ${invoice.invoice_number} z "${oldStatus}" na "${status}"`,
        { old_status: oldStatus, new_status: status }
      );
    }

    return await this.getInvoiceById(id);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, paidAmount: number | undefined, userId: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);

    const amount = paidAmount !== undefined ? paidAmount : Number(invoice.gross_total);
    invoice.paid_amount = amount;

    if (amount >= Number(invoice.gross_total)) {
      invoice.status = InvoiceStatus.PAID;
    } else if (amount > 0) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    await this.invoiceRepository.save(invoice);

    // Log activity
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await activityService.logActivity(
        userId,
        'marked_invoice_paid',
        'invoice',
        invoice.id,
        `${user.first_name} ${user.last_name} oznaczył fakturę ${invoice.invoice_number} jako opłaconą (${amount} ${invoice.currency})`,
        { paid_amount: amount }
      );
    }

    return await this.getInvoiceById(id);
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(filters?: { start_date?: Date; end_date?: Date }): Promise<InvoiceStatistics> {
    const queryBuilder = this.invoiceRepository.createQueryBuilder('invoice');

    if (filters?.start_date) {
      queryBuilder.andWhere('invoice.issue_date >= :startDate', { startDate: filters.start_date });
    }

    if (filters?.end_date) {
      queryBuilder.andWhere('invoice.issue_date <= :endDate', { endDate: filters.end_date });
    }

    const invoices = await queryBuilder.getMany();

    const stats: InvoiceStatistics = {
      total_count: invoices.length,
      draft_count: 0,
      sent_count: 0,
      paid_count: 0,
      partially_paid_count: 0,
      overdue_count: 0,
      cancelled_count: 0,
      total_net: 0,
      total_gross: 0,
      total_paid: 0,
      total_pending: 0,
    };

    for (const invoice of invoices) {
      switch (invoice.status) {
        case InvoiceStatus.DRAFT:
          stats.draft_count++;
          break;
        case InvoiceStatus.SENT:
          stats.sent_count++;
          break;
        case InvoiceStatus.PAID:
          stats.paid_count++;
          break;
        case InvoiceStatus.PARTIALLY_PAID:
          stats.partially_paid_count++;
          break;
        case InvoiceStatus.OVERDUE:
          stats.overdue_count++;
          break;
        case InvoiceStatus.CANCELLED:
          stats.cancelled_count++;
          break;
      }

      if (invoice.status !== InvoiceStatus.CANCELLED) {
        stats.total_net += Number(invoice.net_total);
        stats.total_gross += Number(invoice.gross_total);
        stats.total_paid += Number(invoice.paid_amount);
      }
    }

    stats.total_pending = stats.total_gross - stats.total_paid;

    return stats;
  }

  /**
   * Mark overdue invoices
   */
  async markOverdueInvoices(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.invoiceRepository.update(
      {
        status: InvoiceStatus.SENT,
        due_date: LessThan(today),
      },
      {
        status: InvoiceStatus.OVERDUE,
      }
    );

    return result.affected || 0;
  }

  // ==================== INVOICE ITEMS ====================

  /**
   * Add item to invoice
   */
  async addItem(invoiceId: string, data: CreateInvoiceItemDto, position?: number): Promise<InvoiceItem> {
    const invoice = await this.getInvoiceById(invoiceId);

    // Don't allow editing paid or cancelled invoices
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można edytować opłaconej lub anulowanej faktury');
    }

    // Calculate position if not provided
    if (position === undefined) {
      const maxPosition = await this.invoiceItemRepository
        .createQueryBuilder('item')
        .where('item.invoice_id = :invoiceId', { invoiceId })
        .select('MAX(item.position)', 'maxPosition')
        .getRawOne();
      position = (maxPosition?.maxPosition || 0) + 1;
    }

    const amounts = this.calculateItemAmounts(data);

    const item = this.invoiceItemRepository.create({
      invoice_id: invoiceId,
      position,
      description: data.description,
      quantity: data.quantity,
      unit: data.unit || 'szt.',
      unit_price_net: data.unit_price_net,
      vat_rate: data.vat_rate !== undefined ? data.vat_rate : 23,
      ...amounts,
    });

    const savedItem = await this.invoiceItemRepository.save(item);

    // Recalculate invoice totals
    await this.recalculateTotals(invoiceId);

    return savedItem;
  }

  /**
   * Update invoice item
   */
  async updateItem(itemId: string, data: UpdateInvoiceItemDto): Promise<InvoiceItem> {
    const item = await this.invoiceItemRepository.findOne({
      where: { id: itemId },
      relations: ['invoice'],
    });

    if (!item) {
      throw new Error('Pozycja faktury nie znaleziona');
    }

    // Don't allow editing paid or cancelled invoices
    if (item.invoice.status === InvoiceStatus.PAID || item.invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można edytować opłaconej lub anulowanej faktury');
    }

    Object.assign(item, data);

    // Recalculate amounts
    const amounts = this.calculateItemAmounts({
      quantity: item.quantity,
      unit_price_net: item.unit_price_net,
      vat_rate: item.vat_rate,
    });
    Object.assign(item, amounts);

    const savedItem = await this.invoiceItemRepository.save(item);

    // Recalculate invoice totals
    await this.recalculateTotals(item.invoice_id);

    return savedItem;
  }

  /**
   * Remove invoice item
   */
  async removeItem(itemId: string): Promise<void> {
    const item = await this.invoiceItemRepository.findOne({
      where: { id: itemId },
      relations: ['invoice'],
    });

    if (!item) {
      throw new Error('Pozycja faktury nie znaleziona');
    }

    // Don't allow editing paid or cancelled invoices
    if (item.invoice.status === InvoiceStatus.PAID || item.invoice.status === InvoiceStatus.CANCELLED) {
      throw new Error('Nie można edytować opłaconej lub anulowanej faktury');
    }

    const invoiceId = item.invoice_id;
    await this.invoiceItemRepository.remove(item);

    // Recalculate invoice totals
    await this.recalculateTotals(invoiceId);
  }

  /**
   * Get invoice items
   */
  async getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return await this.invoiceItemRepository.find({
      where: { invoice_id: invoiceId },
      order: { position: 'ASC' },
    });
  }
}

export default new InvoiceService();
