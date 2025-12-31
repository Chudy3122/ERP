import { AppDataSource } from '../database/data-source';
import { UserStatus, StatusType } from '../models/UserStatus.model';
import { User } from '../models/User.model';

class UserStatusService {
  private userStatusRepository = AppDataSource.getRepository(UserStatus);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Get or create user status
   */
  async getOrCreateStatus(userId: string): Promise<UserStatus> {
    let status = await this.userStatusRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!status) {
      // Create default status if doesn't exist
      status = this.userStatusRepository.create({
        user_id: userId,
        status: StatusType.OFFLINE,
        last_seen: new Date(),
      });
      await this.userStatusRepository.save(status);

      // Load user relation
      status = await this.userStatusRepository.findOne({
        where: { user_id: userId },
        relations: ['user'],
      });
    }

    return status!;
  }

  /**
   * Update user status
   */
  async updateStatus(
    userId: string,
    statusType: StatusType,
    customMessage?: string
  ): Promise<UserStatus> {
    const status = await this.getOrCreateStatus(userId);

    status.status = statusType;
    status.last_seen = new Date();

    if (customMessage !== undefined) {
      status.custom_message = customMessage;
    }

    await this.userStatusRepository.save(status);

    return this.userStatusRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    })!;
  }

  /**
   * Set user online
   */
  async setOnline(userId: string): Promise<UserStatus> {
    return this.updateStatus(userId, StatusType.ONLINE);
  }

  /**
   * Set user offline
   */
  async setOffline(userId: string): Promise<UserStatus> {
    return this.updateStatus(userId, StatusType.OFFLINE);
  }

  /**
   * Set user away
   */
  async setAway(userId: string, customMessage?: string): Promise<UserStatus> {
    return this.updateStatus(userId, StatusType.AWAY, customMessage);
  }

  /**
   * Set user busy
   */
  async setBusy(userId: string, customMessage?: string): Promise<UserStatus> {
    return this.updateStatus(userId, StatusType.BUSY, customMessage);
  }

  /**
   * Set user in meeting
   */
  async setInMeeting(userId: string, customMessage?: string): Promise<UserStatus> {
    return this.updateStatus(userId, StatusType.IN_MEETING, customMessage);
  }

  /**
   * Get user status by user ID
   */
  async getUserStatus(userId: string): Promise<UserStatus | null> {
    return this.userStatusRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  /**
   * Get multiple user statuses
   */
  async getMultipleStatuses(userIds: string[]): Promise<UserStatus[]> {
    if (userIds.length === 0) return [];

    return this.userStatusRepository
      .createQueryBuilder('status')
      .leftJoinAndSelect('status.user', 'user')
      .where('status.user_id IN (:...userIds)', { userIds })
      .getMany();
  }

  /**
   * Get all online users
   */
  async getOnlineUsers(): Promise<UserStatus[]> {
    return this.userStatusRepository.find({
      where: { status: StatusType.ONLINE },
      relations: ['user'],
    });
  }

  /**
   * Update last seen timestamp
   */
  async updateLastSeen(userId: string): Promise<void> {
    await this.userStatusRepository.update(
      { user_id: userId },
      { last_seen: new Date() }
    );
  }

  /**
   * Set all users offline (for cleanup/restart)
   */
  async setAllOffline(): Promise<void> {
    await this.userStatusRepository.update(
      {},
      { status: StatusType.OFFLINE, last_seen: new Date() }
    );
  }

  /**
   * Get status statistics
   */
  async getStatusStats(): Promise<{
    online: number;
    offline: number;
    away: number;
    busy: number;
    in_meeting: number;
    total: number;
  }> {
    const [online, offline, away, busy, in_meeting, total] = await Promise.all([
      this.userStatusRepository.count({ where: { status: StatusType.ONLINE } }),
      this.userStatusRepository.count({ where: { status: StatusType.OFFLINE } }),
      this.userStatusRepository.count({ where: { status: StatusType.AWAY } }),
      this.userStatusRepository.count({ where: { status: StatusType.BUSY } }),
      this.userStatusRepository.count({ where: { status: StatusType.IN_MEETING } }),
      this.userStatusRepository.count(),
    ]);

    return { online, offline, away, busy, in_meeting, total };
  }
}

export default new UserStatusService();
