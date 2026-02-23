import { AppDataSource } from '../config/database';
import { CrmDealActivity, DealActivityType } from '../models/CrmDealActivity.model';
import { MoreThan, LessThan, IsNull } from 'typeorm';

class CrmDealActivityService {
  private activityRepository = AppDataSource.getRepository(CrmDealActivity);

  async createActivity(dealId: string, data: {
    type: DealActivityType;
    title: string;
    description?: string;
    scheduled_at?: Date;
    metadata?: Record<string, any>;
  }, userId: string): Promise<CrmDealActivity> {
    const activity = this.activityRepository.create({
      deal_id: dealId,
      type: data.type,
      title: data.title,
      description: data.description,
      scheduled_at: data.scheduled_at,
      metadata: data.metadata,
      created_by: userId,
    });
    return this.activityRepository.save(activity);
  }

  async getDealActivities(dealId: string): Promise<CrmDealActivity[]> {
    return this.activityRepository.find({
      where: { deal_id: dealId },
      relations: ['creator'],
      order: { created_at: 'DESC' },
    });
  }

  async updateActivity(id: string, data: {
    title?: string;
    description?: string;
    scheduled_at?: Date;
    type?: DealActivityType;
  }): Promise<CrmDealActivity | null> {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) return null;
    Object.assign(activity, data);
    return this.activityRepository.save(activity);
  }

  async deleteActivity(id: string): Promise<boolean> {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) return false;
    await this.activityRepository.remove(activity);
    return true;
  }

  async markCompleted(id: string): Promise<CrmDealActivity | null> {
    const activity = await this.activityRepository.findOne({ where: { id } });
    if (!activity) return null;
    activity.is_completed = true;
    activity.completed_at = new Date();
    return this.activityRepository.save(activity);
  }

  async getScheduledActivities(userId?: string, daysAhead: number = 7): Promise<CrmDealActivity[]> {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);

    const where: any = {
      is_completed: false,
      scheduled_at: MoreThan(now),
    };

    // Also filter scheduled_at < future
    if (userId) {
      where.created_by = userId;
    }

    return this.activityRepository.find({
      where: {
        ...where,
        scheduled_at: MoreThan(now),
      },
      relations: ['deal', 'creator'],
      order: { scheduled_at: 'ASC' },
      take: 50,
    });
  }
}

export default new CrmDealActivityService();
