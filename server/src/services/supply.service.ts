import { AppDataSource } from '../config/database';
import {
  SupplyRequest,
  SupplyRequestStatus,
  SupplyCategory,
  SupplyPriority,
} from '../models/SupplyRequest.model';

interface CreateSupplyDto {
  item_name: string;
  quantity?: number;
  category?: SupplyCategory;
  priority?: SupplyPriority;
  description?: string;
}

export class SupplyService {
  private repo = AppDataSource.getRepository(SupplyRequest);

  /** All requests (for sekretariat / admin) */
  async getAll(status?: string): Promise<SupplyRequest[]> {
    const qb = this.repo
      .createQueryBuilder('sr')
      .leftJoinAndSelect('sr.user', 'user')
      .leftJoinAndSelect('sr.reviewer', 'reviewer')
      .orderBy('sr.created_at', 'DESC');
    if (status) qb.andWhere('sr.status = :status', { status });
    return qb.getMany();
  }

  /** Requests created by a specific user */
  async getMine(userId: string): Promise<SupplyRequest[]> {
    return this.repo.find({
      where: { user_id: userId },
      relations: ['reviewer'],
      order: { created_at: 'DESC' },
    });
  }

  async create(data: CreateSupplyDto, userId: string): Promise<SupplyRequest> {
    if (!data.item_name?.trim()) throw new Error('Nazwa artykułu jest wymagana');
    const request = this.repo.create({
      user_id: userId,
      item_name: data.item_name.trim(),
      quantity: data.quantity && data.quantity > 0 ? data.quantity : 1,
      category: data.category || SupplyCategory.OFFICE,
      priority: data.priority || SupplyPriority.MEDIUM,
      description: data.description?.trim() || null,
      status: SupplyRequestStatus.PENDING,
    });
    return this.repo.save(request);
  }

  async review(
    id: string,
    status: SupplyRequestStatus.APPROVED | SupplyRequestStatus.REJECTED,
    reviewerId: string,
    notes?: string,
  ): Promise<SupplyRequest> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new Error('Zgłoszenie nie znalezione');
    request.status = status;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.review_notes = notes?.trim() || null;
    await this.repo.save(request);
    return (await this.repo.findOne({ where: { id }, relations: ['user', 'reviewer'] }))!;
  }

  /** Owner can delete own pending request */
  async delete(id: string, userId: string, isManager: boolean): Promise<void> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new Error('Zgłoszenie nie znalezione');
    if (!isManager && request.user_id !== userId) {
      throw new Error('Brak uprawnień do usunięcia tego zgłoszenia');
    }
    await this.repo.remove(request);
  }
}

export default new SupplyService();
