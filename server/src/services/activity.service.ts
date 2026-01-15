import { AppDataSource } from '../config/database';
import { ActivityLog } from '../models/ActivityLog.model';
import { User } from '../models/User.model';

export class ActivityService {
  private activityLogRepository = AppDataSource.getRepository(ActivityLog);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Log an activity action
   */
  async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    description: string,
    metadata?: any
  ): Promise<ActivityLog> {
    const activityLog = this.activityLogRepository.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId || undefined,
      description,
      metadata,
    }) as ActivityLog;

    return await this.activityLogRepository.save(activityLog);
  }

  /**
   * Get recent activities (for dashboard stream)
   */
  async getRecentActivities(limit: number = 50): Promise<ActivityLog[]> {
    return await this.activityLogRepository.find({
      order: {
        created_at: 'DESC',
      },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * Get user's activities
   */
  async getUserActivities(userId: string, limit: number = 100): Promise<ActivityLog[]> {
    return await this.activityLogRepository.find({
      where: {
        user_id: userId,
      },
      order: {
        created_at: 'DESC',
      },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * Get activities for a specific project
   */
  async getProjectActivities(projectId: string): Promise<ActivityLog[]> {
    return await this.activityLogRepository.find({
      where: {
        entity_type: 'project',
        entity_id: projectId,
      },
      order: {
        created_at: 'DESC',
      },
      relations: ['user'],
    });
  }

  /**
   * Get activities by entity type
   */
  async getActivitiesByEntityType(entityType: string, limit: number = 50): Promise<ActivityLog[]> {
    return await this.activityLogRepository.find({
      where: {
        entity_type: entityType,
      },
      order: {
        created_at: 'DESC',
      },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * Get activity feed for user (their projects/tasks)
   */
  async getActivityFeed(userId: string, filters?: any): Promise<ActivityLog[]> {
    const queryBuilder = this.activityLogRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .orderBy('activity.created_at', 'DESC')
      .take(50);

    // Filter by entity types if provided
    if (filters?.entityTypes && filters.entityTypes.length > 0) {
      queryBuilder.andWhere('activity.entity_type IN (:...types)', {
        types: filters.entityTypes,
      });
    }

    return await queryBuilder.getMany();
  }

  /**
   * Delete old activity logs (cleanup)
   */
  async deleteOldActivities(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.activityLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected || 0;
  }
}

export default new ActivityService();
