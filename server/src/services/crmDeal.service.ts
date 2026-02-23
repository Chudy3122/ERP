import { AppDataSource } from '../config/database';
import { CrmDeal, DealStatus, DealPriority } from '../models/CrmDeal.model';
import { CrmPipelineStage } from '../models/CrmPipelineStage.model';
import { CrmDealActivity, DealActivityType } from '../models/CrmDealActivity.model';
import { Invoice, InvoiceStatus } from '../models/Invoice.model';
import { InvoiceItem } from '../models/InvoiceItem.model';

interface CreateDealData {
  title: string;
  description?: string;
  pipeline_id: string;
  stage_id: string;
  client_id?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  value?: number;
  currency?: string;
  priority?: DealPriority;
  expected_close_date?: Date;
  assigned_to?: string;
}

interface DealFilters {
  status?: DealStatus;
  priority?: DealPriority;
  assigned_to?: string;
  search?: string;
}

class CrmDealService {
  private dealRepository = AppDataSource.getRepository(CrmDeal);
  private stageRepository = AppDataSource.getRepository(CrmPipelineStage);
  private activityRepository = AppDataSource.getRepository(CrmDealActivity);
  private invoiceRepository = AppDataSource.getRepository(Invoice);
  private invoiceItemRepository = AppDataSource.getRepository(InvoiceItem);

  async createDeal(data: CreateDealData, userId: string): Promise<CrmDeal> {
    // Get max position in this stage
    const maxPos = await this.dealRepository
      .createQueryBuilder('d')
      .select('MAX(d.position)', 'max')
      .where('d.stage_id = :stageId', { stageId: data.stage_id })
      .getRawOne();

    const deal = this.dealRepository.create({
      ...data,
      position: (maxPos?.max ?? -1) + 1,
      created_by: userId,
    });

    const savedDeal = await this.dealRepository.save(deal);

    // Auto-activity: Deal created
    const activity = this.activityRepository.create({
      deal_id: savedDeal.id,
      type: DealActivityType.NOTE,
      title: 'Deal utworzony',
      created_by: userId,
    });
    await this.activityRepository.save(activity);

    return this.getDealById(savedDeal.id) as Promise<CrmDeal>;
  }

  async getDealsByPipeline(pipelineId: string, filters?: DealFilters): Promise<Record<string, CrmDeal[]>> {
    const qb = this.dealRepository
      .createQueryBuilder('deal')
      .leftJoinAndSelect('deal.client', 'client')
      .leftJoinAndSelect('deal.assignee', 'assignee')
      .leftJoinAndSelect('deal.stage', 'stage')
      .where('deal.pipeline_id = :pipelineId', { pipelineId });

    if (filters?.status) {
      qb.andWhere('deal.status = :status', { status: filters.status });
    }
    if (filters?.priority) {
      qb.andWhere('deal.priority = :priority', { priority: filters.priority });
    }
    if (filters?.assigned_to) {
      qb.andWhere('deal.assigned_to = :assignedTo', { assignedTo: filters.assigned_to });
    }
    if (filters?.search) {
      qb.andWhere('(deal.title ILIKE :search OR deal.contact_person ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    qb.orderBy('deal.position', 'ASC');

    const deals = await qb.getMany();

    // Group by stage_id
    const grouped: Record<string, CrmDeal[]> = {};
    for (const deal of deals) {
      if (!grouped[deal.stage_id]) {
        grouped[deal.stage_id] = [];
      }
      grouped[deal.stage_id].push(deal);
    }

    return grouped;
  }

  async getDealById(id: string): Promise<CrmDeal | null> {
    return this.dealRepository.findOne({
      where: { id },
      relations: ['client', 'assignee', 'creator', 'pipeline', 'stage', 'activities'],
    });
  }

  async updateDeal(id: string, data: Partial<CreateDealData>): Promise<CrmDeal | null> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) return null;
    Object.assign(deal, data);
    await this.dealRepository.save(deal);
    return this.getDealById(id);
  }

  async deleteDeal(id: string): Promise<boolean> {
    const deal = await this.dealRepository.findOne({ where: { id } });
    if (!deal) return false;
    await this.dealRepository.remove(deal);
    return true;
  }

  async moveDeal(dealId: string, targetStageId: string, position: number, userId: string): Promise<CrmDeal | null> {
    const deal = await this.dealRepository.findOne({ where: { id: dealId } });
    if (!deal) return null;

    const oldStageId = deal.stage_id;
    const targetStage = await this.stageRepository.findOne({ where: { id: targetStageId } });
    if (!targetStage) return null;

    // Update positions in source stage (shift down)
    await this.dealRepository
      .createQueryBuilder()
      .update(CrmDeal)
      .set({ position: () => 'position - 1' })
      .where('stage_id = :stageId AND position > :pos', { stageId: oldStageId, pos: deal.position })
      .execute();

    // Update positions in target stage (shift up)
    await this.dealRepository
      .createQueryBuilder()
      .update(CrmDeal)
      .set({ position: () => 'position + 1' })
      .where('stage_id = :stageId AND position >= :pos', { stageId: targetStageId, pos: position })
      .execute();

    deal.stage_id = targetStageId;
    deal.position = position;

    // Auto-status change on won/lost stages
    if (targetStage.is_won_stage && deal.status !== DealStatus.WON) {
      deal.status = DealStatus.WON;
      deal.actual_close_date = new Date();
    } else if (targetStage.is_lost_stage && deal.status !== DealStatus.LOST) {
      deal.status = DealStatus.LOST;
      deal.actual_close_date = new Date();
    } else if (!targetStage.is_won_stage && !targetStage.is_lost_stage && deal.status !== DealStatus.OPEN) {
      deal.status = DealStatus.OPEN;
      deal.actual_close_date = null as any;
    }

    await this.dealRepository.save(deal);

    // Log stage change activity
    if (oldStageId !== targetStageId) {
      const oldStage = await this.stageRepository.findOne({ where: { id: oldStageId } });
      const activity = this.activityRepository.create({
        deal_id: dealId,
        type: DealActivityType.STAGE_CHANGE,
        title: `Przeniesiono z "${oldStage?.name}" do "${targetStage.name}"`,
        metadata: { from_stage_id: oldStageId, to_stage_id: targetStageId, from_stage: oldStage?.name, to_stage: targetStage.name },
        created_by: userId,
      });
      await this.activityRepository.save(activity);
    }

    return this.getDealById(dealId);
  }

  async updateDealStatus(dealId: string, status: DealStatus, lostReason?: string, userId?: string): Promise<CrmDeal | null> {
    const deal = await this.dealRepository.findOne({ where: { id: dealId } });
    if (!deal) return null;

    const oldStatus = deal.status;
    deal.status = status;

    if (status === DealStatus.LOST && lostReason) {
      deal.lost_reason = lostReason;
    }
    if (status === DealStatus.WON || status === DealStatus.LOST) {
      deal.actual_close_date = new Date();
    }

    await this.dealRepository.save(deal);

    // Log status change
    if (userId && oldStatus !== status) {
      const activity = this.activityRepository.create({
        deal_id: dealId,
        type: DealActivityType.STATUS_CHANGE,
        title: `Status zmieniony z "${oldStatus}" na "${status}"`,
        metadata: { from_status: oldStatus, to_status: status },
        created_by: userId,
      });
      await this.activityRepository.save(activity);
    }

    return this.getDealById(dealId);
  }

  async getDealsForClient(clientId: string): Promise<CrmDeal[]> {
    return this.dealRepository.find({
      where: { client_id: clientId },
      relations: ['pipeline', 'stage', 'assignee'],
      order: { created_at: 'DESC' },
    });
  }

  async getDealStatistics(pipelineId?: string): Promise<{
    total_deals: number;
    open_deals: number;
    won_deals: number;
    lost_deals: number;
    total_value: number;
    won_value: number;
    avg_deal_size: number;
    deals_by_stage: { stage_name: string; stage_color: string; count: number; value: number }[];
  }> {
    const qb = this.dealRepository.createQueryBuilder('deal');

    if (pipelineId) {
      qb.where('deal.pipeline_id = :pipelineId', { pipelineId });
    }

    const deals = await qb.getMany();

    const open = deals.filter(d => d.status === DealStatus.OPEN);
    const won = deals.filter(d => d.status === DealStatus.WON);
    const lost = deals.filter(d => d.status === DealStatus.LOST);

    const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);
    const wonValue = won.reduce((sum, d) => sum + Number(d.value), 0);

    // Deals by stage
    let stageQuery = this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.stage', 'stage')
      .select('stage.name', 'stage_name')
      .addSelect('stage.color', 'stage_color')
      .addSelect('COUNT(deal.id)', 'count')
      .addSelect('COALESCE(SUM(deal.value), 0)', 'value')
      .groupBy('stage.name')
      .addGroupBy('stage.color')
      .addGroupBy('stage.position')
      .orderBy('stage.position', 'ASC');

    if (pipelineId) {
      stageQuery = stageQuery.where('deal.pipeline_id = :pipelineId', { pipelineId });
    }

    const dealsByStage = await stageQuery.getRawMany();

    return {
      total_deals: deals.length,
      open_deals: open.length,
      won_deals: won.length,
      lost_deals: lost.length,
      total_value: totalValue,
      won_value: wonValue,
      avg_deal_size: deals.length > 0 ? totalValue / deals.length : 0,
      deals_by_stage: dealsByStage.map(s => ({
        stage_name: s.stage_name,
        stage_color: s.stage_color,
        count: parseInt(s.count),
        value: parseFloat(s.value),
      })),
    };
  }

  async getRevenueForecast(pipelineId?: string): Promise<{
    month: string;
    weighted_value: number;
    total_value: number;
    deal_count: number;
  }[]> {
    let qb = this.dealRepository
      .createQueryBuilder('deal')
      .leftJoin('deal.stage', 'stage')
      .select("TO_CHAR(deal.expected_close_date, 'YYYY-MM')", 'month')
      .addSelect('SUM(deal.value * stage.win_probability / 100)', 'weighted_value')
      .addSelect('SUM(deal.value)', 'total_value')
      .addSelect('COUNT(deal.id)', 'deal_count')
      .where('deal.status = :status', { status: DealStatus.OPEN })
      .andWhere('deal.expected_close_date IS NOT NULL')
      .groupBy("TO_CHAR(deal.expected_close_date, 'YYYY-MM')")
      .orderBy('month', 'ASC');

    if (pipelineId) {
      qb = qb.andWhere('deal.pipeline_id = :pipelineId', { pipelineId });
    }

    const rows = await qb.getRawMany();

    return rows.map(r => ({
      month: r.month,
      weighted_value: parseFloat(r.weighted_value) || 0,
      total_value: parseFloat(r.total_value) || 0,
      deal_count: parseInt(r.deal_count),
    }));
  }

  async getConversionRates(pipelineId: string): Promise<{
    stage_name: string;
    stage_color: string;
    deal_count: number;
    conversion_rate: number;
  }[]> {
    const stages = await this.stageRepository.find({
      where: { pipeline_id: pipelineId, is_active: true },
      order: { position: 'ASC' },
    });

    const result = [];
    let firstStageCount = 0;

    for (const stage of stages) {
      const count = await this.dealRepository.count({
        where: { pipeline_id: pipelineId, stage_id: stage.id },
      });

      // Also count deals that passed through this stage (won/lost that were in later stages)
      const totalEverInStage = await this.dealRepository
        .createQueryBuilder('deal')
        .leftJoin('deal.stage', 'currentStage')
        .where('deal.pipeline_id = :pipelineId', { pipelineId })
        .andWhere('(deal.stage_id = :stageId OR currentStage.position > :pos)', {
          stageId: stage.id,
          pos: stage.position,
        })
        .getCount();

      if (stage.position === 0) {
        firstStageCount = totalEverInStage || 1;
      }

      result.push({
        stage_name: stage.name,
        stage_color: stage.color,
        deal_count: totalEverInStage,
        conversion_rate: firstStageCount > 0
          ? Math.round((totalEverInStage / firstStageCount) * 100)
          : 0,
      });
    }

    return result;
  }

  async convertWonDealToInvoice(dealId: string, userId: string): Promise<Invoice> {
    const deal = await this.dealRepository.findOne({
      where: { id: dealId },
      relations: ['client'],
    });

    if (!deal) throw new Error('Deal nie znaleziony');
    if (deal.status !== DealStatus.WON) throw new Error('Tylko wygrane deale mogą być konwertowane na fakturę');
    if (deal.won_invoice_id) throw new Error('Faktura została już wygenerowana dla tego deala');
    if (!deal.client_id) throw new Error('Deal musi mieć przypisanego kontrahenta');

    // Generate invoice number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('inv')
      .where("inv.invoice_number LIKE :pattern", { pattern: `FV/${year}/${month}/%` })
      .orderBy('inv.created_at', 'DESC')
      .getOne();

    let nextNum = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoice_number.split('/');
      nextNum = parseInt(parts[parts.length - 1]) + 1;
    }

    const invoiceNumber = `FV/${year}/${month}/${String(nextNum).padStart(4, '0')}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoice = this.invoiceRepository.create({
      invoice_number: invoiceNumber,
      client_id: deal.client_id,
      issue_date: now,
      sale_date: now,
      due_date: dueDate,
      currency: deal.currency || 'PLN',
      notes: `Wygenerowano z deala: ${deal.title}`,
      created_by: userId,
      status: InvoiceStatus.DRAFT,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Create a single invoice item from deal value
    const netValue = Number(deal.value);
    const vatRate = 23;
    const vatAmount = netValue * vatRate / 100;

    const item = this.invoiceItemRepository.create({
      invoice_id: savedInvoice.id,
      description: deal.title,
      quantity: 1,
      unit: 'szt.',
      unit_price_net: netValue,
      vat_rate: vatRate,
      net_amount: netValue,
      vat_amount: vatAmount,
      gross_amount: netValue + vatAmount,
      position: 1,
    });
    await this.invoiceItemRepository.save(item);

    // Update invoice totals
    await this.invoiceRepository.update(savedInvoice.id, {
      net_total: netValue,
      vat_total: vatAmount,
      gross_total: netValue + vatAmount,
    });

    // Link invoice to deal
    deal.won_invoice_id = savedInvoice.id;
    await this.dealRepository.save(deal);

    // Log activity
    const activity = this.activityRepository.create({
      deal_id: dealId,
      type: DealActivityType.NOTE,
      title: `Wygenerowano fakturę ${invoiceNumber}`,
      metadata: { invoice_id: savedInvoice.id, invoice_number: invoiceNumber },
      created_by: userId,
    });
    await this.activityRepository.save(activity);

    return savedInvoice;
  }
}

export default new CrmDealService();
