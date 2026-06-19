import { AppDataSource } from '../config/database';
import { Notification, NotificationType, NotificationPriority } from '../models/Notification.model';
import { User } from '../models/User.model';

// Chat-related notifications are surfaced only on the chat bubble + "Chat & Meet"
// badge, never in the general notification centre / bell.
const CHAT_NOTIFICATION_TYPES = [
  NotificationType.CHAT_MESSAGE,
  NotificationType.CHAT_MENTION,
  NotificationType.CHANNEL_INVITE,
];

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
      // Chat notifications live on the chat bubble + "Chat & Meet" badge only,
      // never in the general notification centre.
      .andWhere('notification.type NOT IN (:...chatTypes)', { chatTypes: CHAT_NOTIFICATION_TYPES })
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
    return this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.is_read = :isRead', { isRead: false })
      .andWhere('notification.type NOT IN (:...chatTypes)', { chatTypes: CHAT_NOTIFICATION_TYPES })
      .getCount();
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
      actionUrl: `/meeting?channel=${channelId}`,
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
      actionUrl: `/meeting?channel=${channelId}`,
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
      actionUrl: `/meeting?channel=${channelId}`,
      priority: NotificationPriority.NORMAL,
      relatedUserId: inviterId,
      relatedEntityType: 'channel',
      relatedEntityId: channelId,
    });
  }

  private leaveTypeLabel(leaveType: string): string {
    const labels: Record<string, string> = {
      vacation: 'Urlop wypoczynkowy',
      sick_leave: 'Zwolnienie lekarskie',
      personal: 'Urlop na żądanie',
      unpaid: 'Urlop bezpłatny',
      parental: 'Urlop rodzicielski',
      other: 'Inny',
    };
    return labels[leaveType] ?? leaveType;
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
      message: `Twój wniosek urlopowy od ${startDate} do ${endDate} został ${
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
      message: `${employeeName} złożył wniosek urlopowy od ${startDate} do ${endDate}`,
      actionUrl: '/time-tracking/leave',
      priority: NotificationPriority.NORMAL,
      relatedUserId: employeeId,
      relatedEntityType: 'leave_request',
      relatedEntityId: leaveRequestId,
    });
  }

  /**
   * Notify sekretariat/admin about a new supply (zaopatrzenie) request
   */
  async notifyNewSupplyRequest(
    recipientId: string,
    requesterName: string,
    itemName: string,
    quantity: number,
    requestId: string,
    requesterId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId: recipientId,
      type: NotificationType.SUPPLY_REQUEST_NEW,
      title: 'Nowe zgłoszenie zaopatrzenia',
      message: `${requesterName} zgłosił zapotrzebowanie: ${itemName} (x${quantity})`,
      actionUrl: '/supply',
      priority: NotificationPriority.NORMAL,
      relatedUserId: requesterId,
      relatedEntityType: 'supply_request',
      relatedEntityId: requestId,
    });
  }

  /**
   * Notify a user that they were assigned to a project (as a member or manager)
   */
  async notifyProjectAssignment(
    userId: string,
    projectName: string,
    projectId: string,
    assignerName: string,
    assignerId: string,
    asManager: boolean = false,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.PROJECT_ASSIGNED,
      title: asManager ? 'Przypisano Cię jako kierownika projektu' : 'Dodano Cię do projektu',
      message: asManager
        ? `${assignerName} ustawił Cię jako kierownika projektu "${projectName}"`
        : `${assignerName} dodał Cię do projektu "${projectName}"`,
      actionUrl: `/projects/${projectId}`,
      priority: NotificationPriority.NORMAL,
      relatedUserId: assignerId,
      relatedEntityType: 'project',
      relatedEntityId: projectId,
    });
  }

  /**
   * Notify an admin about a newly created ticket (zgłoszenie)
   */
  async notifyNewTicket(
    adminId: string,
    ticketNumber: string,
    ticketTitle: string,
    ticketId: string,
    creatorName: string,
    creatorId: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId: adminId,
      type: NotificationType.TICKET_NEW,
      title: 'Nowe zgłoszenie',
      message: `${creatorName} utworzył zgłoszenie "${ticketNumber}: ${ticketTitle}"`,
      actionUrl: `/tickets/${ticketId}/edit`,
      priority: NotificationPriority.NORMAL,
      relatedUserId: creatorId,
      relatedEntityType: 'ticket',
      relatedEntityId: ticketId,
    });
  }

  /**
   * Notify fleet managers about a new car request
   */
  async notifyNewVehicleRequest(
    recipientId: string,
    requesterName: string,
    destination: string,
    requestId: string,
    requesterId: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId: recipientId,
      type: NotificationType.VEHICLE_REQUEST_NEW,
      title: 'Nowe zapotrzebowanie na samochód',
      message: `${requesterName} prosi o samochód — trasa: ${destination}`,
      actionUrl: '/fleet',
      priority: NotificationPriority.NORMAL,
      relatedUserId: requesterId,
      relatedEntityType: 'vehicle_request',
      relatedEntityId: requestId,
    });
  }

  /**
   * Remind fleet managers about an upcoming vehicle deadline (przegląd, OC, …)
   */
  async notifyVehicleReminder(
    recipientId: string,
    vehicleName: string,
    title: string,
    dueDate: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId: recipientId,
      type: NotificationType.VEHICLE_REMINDER,
      title: 'Przypomnienie — flota',
      message: `${vehicleName}: ${title} — termin ${dueDate}`,
      actionUrl: '/fleet',
      priority: NotificationPriority.HIGH,
      relatedEntityType: 'vehicle',
    });
  }

  /**
   * Notify the requester about the decision on their car request
   */
  async notifyVehicleRequestDecision(
    userId: string,
    approved: boolean,
    destination: string,
    vehicleName: string | null,
    requestId: string,
    reviewerId: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.VEHICLE_REQUEST_DECISION,
      title: approved ? 'Przydzielono samochód' : 'Zapotrzebowanie na samochód odrzucone',
      message: approved
        ? `Na trasę „${destination}" przydzielono: ${vehicleName ?? 'samochód'}`
        : `Twoje zapotrzebowanie na samochód (${destination}) zostało odrzucone`,
      actionUrl: '/fleet',
      priority: approved ? NotificationPriority.NORMAL : NotificationPriority.HIGH,
      relatedUserId: reviewerId,
      relatedEntityType: 'vehicle_request',
      relatedEntityId: requestId,
    });
  }

  /**
   * Remind a user about an upcoming personal calendar event
   */
  async notifyCalendarReminder(
    userId: string,
    title: string,
    whenLabel: string,
    eventId: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.CALENDAR_REMINDER,
      title: 'Przypomnienie',
      message: `${title} — ${whenLabel}`,
      actionUrl: '/private-zone',
      priority: NotificationPriority.HIGH,
      relatedEntityType: 'calendar_event',
      relatedEntityId: eventId,
    });
  }

  /**
   * Notify about a new comment on a supply (zaopatrzenie) request
   */
  async notifySupplyComment(
    recipientId: string,
    commenterName: string,
    itemName: string,
    requestId: string,
    commenterId: string,
  ): Promise<Notification> {
    return this.createNotification({
      userId: recipientId,
      type: NotificationType.SUPPLY_REQUEST_COMMENT,
      title: 'Nowy komentarz do zgłoszenia zaopatrzenia',
      message: `${commenterName} skomentował zgłoszenie: ${itemName}`,
      actionUrl: `/supply/${requestId}`,
      priority: NotificationPriority.NORMAL,
      relatedUserId: commenterId,
      relatedEntityType: 'supply_request',
      relatedEntityId: requestId,
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
   * Notify user about a scheduled meeting invitation
   */
  async notifyMeetingScheduled(
    userId: string,
    organizerName: string,
    meetingTitle: string,
    scheduledDate: string,
    scheduledTime: string,
    platform: string,
    meetingId: string,
    organizerId: string
  ): Promise<Notification> {
    const platformLabel = platform === 'internal' ? 'w aplikacji'
      : platform === 'teams' ? 'Microsoft Teams'
      : platform === 'zoom' ? 'Zoom'
      : 'Google Meet';

    return this.createNotification({
      userId,
      type: NotificationType.MEETING_SCHEDULED,
      title: `Nowe spotkanie: ${meetingTitle}`,
      message: `${organizerName} zaprosił Cię na spotkanie ${platformLabel} dnia ${scheduledDate} o ${scheduledTime}`,
      actionUrl: '/meeting',
      priority: NotificationPriority.HIGH,
      relatedUserId: organizerId,
      relatedEntityType: 'scheduled_meeting',
      relatedEntityId: meetingId,
    });
  }

  /**
   * Notify user about an immediate meeting invitation (WebRTC)
   */
  async notifyMeetingInvitation(
    userId: string,
    callerName: string,
    meetingTitle: string,
    meetingId: string,
    callerId: string
  ): Promise<Notification> {
    return this.createNotification({
      userId,
      type: NotificationType.MEETING_INVITATION,
      title: `${callerName} zaprasza na spotkanie`,
      message: meetingTitle,
      actionUrl: `/meeting/${meetingId}`,
      priority: NotificationPriority.URGENT,
      relatedUserId: callerId,
      relatedEntityType: 'meeting',
      relatedEntityId: meetingId,
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
