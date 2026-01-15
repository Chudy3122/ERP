import { AppDataSource } from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../models/Notification.model';
import { User } from '../models/User.model';

interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: NotificationPriority;
  relatedUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

class NotificationService {
  private notificationRepository = AppDataSource.getRepository(Notification);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const notification = this.notificationRepository.create({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data || null,
      action_url: data.actionUrl || null,
      priority: data.priority || NotificationPriority.NORMAL,
      related_user_id: data.relatedUserId || null,
      related_entity_type: data.relatedEntityType || null,
      related_entity_id: data.relatedEntityId || null,
      is_read: false,
    });

    await this.notificationRepository.save(notification);

    // Load relations
    const result = await this.notificationRepository.findOne({
      where: { id: notification.id },
      relations: ['user', 'related_user'],
    });

    if (!result) {
      throw new Error('Failed to load notification after creation');
    }

    return result;
  }

  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{ notifications: Notification[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.user', 'user')
      .leftJoinAndSelect('notification.related_user', 'related_user')
      .where('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (unreadOnly) {
      queryBuilder.andWhere('notification.is_read = :isRead', { isRead: false });
    }

    const [notifications, total] = await queryBuilder.getManyAndCount();

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      return null;
    }

    notification.is_read = true;
    notification.read_at = new Date();

    await this.notificationRepository.save(notification);

    return this.notificationRepository.findOne({
      where: { id: notificationId },
      relations: ['user', 'related_user'],
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationRepository.delete({
      id: notificationId,
      user_id: userId,
    });

    return (result.affected || 0) > 0;
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<number> {
    const result = await this.notificationRepository.delete({
      user_id: userId,
      is_read: true,
    });

    return result.affected || 0;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: string): Promise<number> {
    const result = await this.notificationRepository.delete({
      user_id: userId,
    });

    return result.affected || 0;
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string, userId: string): Promise<Notification | null> {
    return this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
      relations: ['user', 'related_user'],
    });
  }

  /**
   * Notify user about new chat message
   */
  async notifyNewChatMessage(
    userId: string,
    senderName: string,
    channelName: string,
    messagePreview: string,
    channelId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.CHAT_MESSAGE,
      title: `Nowa wiadomość od ${senderName}`,
      message: `${channelName}: ${messagePreview}`,
      actionUrl: `/chat?channel=${channelId}`,
      priority: NotificationPriority.NORMAL,
      relatedEntityType: 'channel',
      relatedEntityId: channelId,
    });
  }

  /**
   * Notify user about mention in chat
   */
  async notifyMention(
    userId: string,
    senderName: string,
    channelName: string,
    messagePreview: string,
    channelId: string,
    senderId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.CHAT_MENTION,
      title: `${senderName} wspomniał o Tobie`,
      message: `W ${channelName}: ${messagePreview}`,
      actionUrl: `/chat?channel=${channelId}`,
      priority: NotificationPriority.HIGH,
      relatedUserId: senderId,
      relatedEntityType: 'channel',
      relatedEntityId: channelId,
    });
  }

  /**
   * Notify user about channel invitation
   */
  async notifyChannelInvite(
    userId: string,
    inviterName: string,
    channelName: string,
    channelId: string,
    inviterId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.CHANNEL_INVITE,
      title: 'Zaproszenie do kanału',
      message: `${inviterName} zaprosił Cię do ${channelName}`,
      actionUrl: `/chat?channel=${channelId}`,
      priority: NotificationPriority.NORMAL,
      relatedUserId: inviterId,
      relatedEntityType: 'channel',
      relatedEntityId: channelId,
    });
  }

  /**
   * Notify about leave request status
   */
  async notifyLeaveRequestStatus(
    userId: string,
    status: 'approved' | 'rejected',
    leaveType: string,
    startDate: string,
    endDate: string,
    leaveRequestId: string
  ): Promise<Notification> {
    const type = status === 'approved'
      ? NotificationType.LEAVE_REQUEST_APPROVED
      : NotificationType.LEAVE_REQUEST_REJECTED;

    const title = status === 'approved'
      ? 'Wniosek urlopowy zatwierdzony'
      : 'Wniosek urlopowy odrzucony';

    const priority = status === 'approved'
      ? NotificationPriority.NORMAL
      : NotificationPriority.HIGH;

    return this.createNotification({
      userId,
      type,
      title,
      message: `Twój wniosek urlopowy (${leaveType}) od ${startDate} do ${endDate} został ${
        status === 'approved' ? 'zatwierdzony' : 'odrzucony'
      }`,
      actionUrl: '/time-tracking/leave',
      priority,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequestId,
    });
  }

  /**
   * Notify manager about new leave request
   */
  async notifyNewLeaveRequest(
    managerId: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    leaveRequestId: string,
    employeeId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: managerId,
      type: NotificationType.LEAVE_REQUEST_PENDING,
      title: 'Nowy wniosek urlopowy',
      message: `${employeeName} złożył wniosek urlopowy (${leaveType}) od ${startDate} do ${endDate}`,
      actionUrl: '/time-tracking/leave',
      priority: NotificationPriority.NORMAL,
      relatedUserId: employeeId,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequestId,
    });
  }

  /**
   * Notify about time entry status
   */
  async notifyTimeEntryStatus(
    userId: string,
    status: 'approved' | 'rejected',
    date: string,
    hours: number,
    timeEntryId: string
  ): Promise<Notification> {
    const type = status === 'approved'
      ? NotificationType.TIME_ENTRY_APPROVED
      : NotificationType.TIME_ENTRY_REJECTED;

    const title = status === 'approved'
      ? 'Wpis czasu zatwierdzony'
      : 'Wpis czasu odrzucony';

    return this.createNotification({
      userId,
      type,
      title,
      message: `Twój wpis czasu z ${date} (${hours}h) został ${
        status === 'approved' ? 'zatwierdzony' : 'odrzucony'
      }`,
      actionUrl: '/time-tracking',
      priority: NotificationPriority.NORMAL,
      relatedEntityType: 'time_entry',
      relatedEntityId: timeEntryId,
    });
  }

  /**
   * Send system announcement to all users
   */
  async sendSystemAnnouncement(
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.NORMAL
  ): Promise<Notification[]> {
    const users = await this.userRepository.find();
    const notifications: Notification[] = [];

    for (const user of users) {
      const notification = await this.createNotification({
        userId: user.id,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title,
        message,
        priority,
      });
      notifications.push(notification);
    }

    return notifications;
  }
}

export default new NotificationService();
