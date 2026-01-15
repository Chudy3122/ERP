import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { NotificationPreference } from '../models/NotificationPreference.model';
import { User } from '../models/User.model';

export interface UpdateNotificationPreferencesData {
  sound_enabled?: boolean;
  sound_type?: string;
  sound_volume?: number;
  desktop_notifications?: boolean;
  show_preview?: boolean;
  badge_count?: boolean;
  notify_messages?: boolean;
  notify_mentions?: boolean;
  notify_leave_status?: boolean;
  notify_time_reminders?: boolean;
  notify_system_updates?: boolean;
  dnd_enabled?: boolean;
  dnd_start_time?: string | null;
  dnd_end_time?: string | null;
}

class NotificationPreferenceService {
  private notificationPreferenceRepository: Repository<NotificationPreference>;
  private userRepository: Repository<User>;

  constructor() {
    this.notificationPreferenceRepository = AppDataSource.getRepository(NotificationPreference);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Get user's notification preferences
   * If preferences don't exist, create default ones
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.notificationPreferenceRepository.findOne({
      where: { user_id: userId },
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default notification preferences for a user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const preferences = this.notificationPreferenceRepository.create({
      user_id: userId,
      sound_enabled: true,
      sound_type: 'default',
      sound_volume: 50,
      desktop_notifications: true,
      show_preview: true,
      badge_count: true,
      notify_messages: true,
      notify_mentions: true,
      notify_leave_status: true,
      notify_time_reminders: true,
      notify_system_updates: false,
      dnd_enabled: false,
      dnd_start_time: null,
      dnd_end_time: null,
    });

    return await this.notificationPreferenceRepository.save(preferences);
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    data: UpdateNotificationPreferencesData
  ): Promise<NotificationPreference> {
    // Get existing preferences or create default ones
    let preferences = await this.getUserPreferences(userId);

    // Validate sound volume
    if (data.sound_volume !== undefined) {
      if (data.sound_volume < 0 || data.sound_volume > 100) {
        throw new Error('Sound volume must be between 0 and 100');
      }
    }

    // Validate sound type
    if (data.sound_type !== undefined) {
      const validSoundTypes = ['default', 'chime', 'bell', 'pop', 'none'];
      if (!validSoundTypes.includes(data.sound_type)) {
        throw new Error('Invalid sound type');
      }
    }

    // Validate DND times if provided
    if (data.dnd_start_time !== undefined || data.dnd_end_time !== undefined) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

      if (data.dnd_start_time && !timeRegex.test(data.dnd_start_time)) {
        throw new Error('Invalid DND start time format. Use HH:MM or HH:MM:SS');
      }

      if (data.dnd_end_time && !timeRegex.test(data.dnd_end_time)) {
        throw new Error('Invalid DND end time format. Use HH:MM or HH:MM:SS');
      }
    }

    // Update preferences
    Object.assign(preferences, data);

    return await this.notificationPreferenceRepository.save(preferences);
  }

  /**
   * Check if user is in Do Not Disturb mode
   */
  async isDndActive(userId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences.dnd_enabled) {
      return false;
    }

    if (!preferences.dnd_start_time || !preferences.dnd_end_time) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':').map(Number);
      return parts[0] * 3600 + parts[1] * 60 + (parts[2] || 0);
    };

    const startSeconds = parseTime(preferences.dnd_start_time);
    const endSeconds = parseTime(preferences.dnd_end_time);

    // Handle DND period that crosses midnight
    if (startSeconds > endSeconds) {
      return currentTime >= startSeconds || currentTime <= endSeconds;
    }

    return currentTime >= startSeconds && currentTime <= endSeconds;
  }

  /**
   * Check if user should receive a specific notification type
   */
  async shouldNotify(userId: string, notificationType: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    // Check if in DND mode
    const isDnd = await this.isDndActive(userId);
    if (isDnd) {
      return false;
    }

    // Check specific notification type
    switch (notificationType) {
      case 'message':
        return preferences.notify_messages;
      case 'mention':
        return preferences.notify_mentions;
      case 'leave_status':
        return preferences.notify_leave_status;
      case 'time_reminder':
        return preferences.notify_time_reminders;
      case 'system_update':
        return preferences.notify_system_updates;
      default:
        return true;
    }
  }

  /**
   * Reset preferences to default
   */
  async resetToDefault(userId: string): Promise<NotificationPreference> {
    const preferences = await this.getUserPreferences(userId);

    // Reset to defaults
    preferences.sound_enabled = true;
    preferences.sound_type = 'default';
    preferences.sound_volume = 50;
    preferences.desktop_notifications = true;
    preferences.show_preview = true;
    preferences.badge_count = true;
    preferences.notify_messages = true;
    preferences.notify_mentions = true;
    preferences.notify_leave_status = true;
    preferences.notify_time_reminders = true;
    preferences.notify_system_updates = false;
    preferences.dnd_enabled = false;
    preferences.dnd_start_time = null;
    preferences.dnd_end_time = null;

    return await this.notificationPreferenceRepository.save(preferences);
  }
}

export default new NotificationPreferenceService();
