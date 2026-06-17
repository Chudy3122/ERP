import { AppDataSource } from '../config/database';
import {
  SupplyRequest,
  SupplyRequestStatus,
  SupplyCategory,
  SupplyPriority,
} from '../models/SupplyRequest.model';
import { SupplyComment } from '../models/SupplyComment.model';
import { UserRole } from '../models/User.model';

interface CreateSupplyDto {
  item_name: string;
  quantity?: number;
  category?: SupplyCategory;
  priority?: SupplyPriority;
  description?: string;
}

const MANAGER_ROLES: string[] = [UserRole.SEKRETARIAT, UserRole.ADMIN];

export class SupplyService {
  private repo = AppDataSource.getRepository(SupplyRequest);
  private commentRepo = AppDataSource.getRepository(SupplyComment);

  /** Owner of the request or a manager (sekretariat/admin) may view/comment. */
  private async getAccessibleRequest(requestId: string, userId: string, role: string): Promise<SupplyRequest> {
    const request = await this.repo.findOne({ where: { id: requestId } });
    if (!request) throw new Error('Zgłoszenie nie znalezione');
    if (request.user_id !== userId && !MANAGER_ROLES.includes(role)) {
      throw new Error('Brak uprawnień do tego zgłoszenia');
    }
    return request;
  }

  /** List comments for a request (owner or manager). */
  async getComments(requestId: string, userId: string, role: string): Promise<SupplyComment[]> {
    await this.getAccessibleRequest(requestId, userId, role);
    return this.commentRepo.find({
      where: { request_id: requestId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  /** Add a comment (owner or manager). Returns the saved comment and the request. */
  async addComment(
    requestId: string,
    userId: string,
    role: string,
    content: string,
  ): Promise<{ comment: SupplyComment; request: SupplyRequest }> {
    if (!content?.trim()) throw new Error('Komentarz nie może być pusty');
    const request = await this.getAccessibleRequest(requestId, userId, role);
    const created = this.commentRepo.create({
      request_id: requestId,
      user_id: userId,
      content: content.trim(),
    });
    await this.commentRepo.save(created);
    const comment = (await this.commentRepo.findOne({
      where: { id: created.id },
      relations: ['user'],
    }))!;
    return { comment, request };
  }

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

  /**
   * Edit a request.
   * - Admin: any request, any status (also retroactively / "wstecz").
   * - Owner: only their OWN request while still PENDING ("na bieżąco").
   */
  async update(id: string, data: CreateSupplyDto, userId: string, isAdmin: boolean): Promise<SupplyRequest> {
    const request = await this.repo.findOne({ where: { id } });
    if (!request) throw new Error('Zgłoszenie nie znalezione');

    if (!isAdmin) {
      if (request.user_id !== userId) throw new Error('Brak uprawnień do edycji tego zgłoszenia');
      if (request.status !== SupplyRequestStatus.PENDING) {
        throw new Error('Brak uprawnień: obsłużone zgłoszenie może edytować tylko administrator');
      }
    }

    if (data.item_name !== undefined) {
      if (!data.item_name.trim()) throw new Error('Nazwa artykułu jest wymagana');
      request.item_name = data.item_name.trim();
    }
    if (data.quantity !== undefined) request.quantity = data.quantity && data.quantity > 0 ? data.quantity : 1;
    if (data.category !== undefined) request.category = data.category;
    if (data.priority !== undefined) request.priority = data.priority;
    if (data.description !== undefined) request.description = data.description?.trim() || null;

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
