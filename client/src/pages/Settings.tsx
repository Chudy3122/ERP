import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { useTheme } from '../contexts/ThemeContext';
import * as notificationPreferenceApi from '../api/notificationPreference.api';
import type { NotificationPreference, UpdateNotificationPreferencesData } from '../api/notificationPreference.api';
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  User,
  Shield,
  Palette,
  Globe,
  Accessibility,
  ChevronRight,
  Check,
  Eye,
  Clock,
  Volume2,
  Keyboard,
  Calendar,
  Smartphone,
  BellOff,
  MessageSquare,
  AtSign,
  Briefcase,
  Timer,
  Settings as SettingsIcon,
  RotateCcw,
} from 'lucide-react';

type SettingsSection = 'appearance' | 'notifications' | 'privacy' | 'accessibility' | 'language';

const Settings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, actualTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference | null>(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  // Local settings state
  const [settings, setSettings] = useState({
    compactMode: localStorage.getItem('erp-compact-mode') === 'true',
    showAvatars: localStorage.getItem('erp-show-avatars') !== 'false',
    animationsEnabled: localStorage.getItem('erp-animations') !== 'false',
    showOnlineStatus: localStorage.getItem('erp-show-online') !== 'false',
    showLastSeen: localStorage.getItem('erp-show-lastseen') !== 'false',
    showReadReceipts: localStorage.getItem('erp-read-receipts') !== 'false',
    highContrast: localStorage.getItem('erp-high-contrast') === 'true',
    reducedMotion: localStorage.getItem('erp-reduced-motion') === 'true',
    largerText: localStorage.getItem('erp-larger-text') === 'true',
    keyboardShortcuts: localStorage.getItem('erp-keyboard-shortcuts') !== 'false',
    language: localStorage.getItem('erp-language') || 'pl',
    dateFormat: localStorage.getItem('erp-date-format') || 'DD.MM.YYYY',
    timeFormat: localStorage.getItem('erp-time-format') || '24h',
    firstDayOfWeek: localStorage.getItem('erp-first-day') || 'monday',
  });

  // Load notification preferences when switching to notifications tab
  useEffect(() => {
    if (activeSection === 'notifications' && !notifPrefs && !notifLoading) {
      loadNotifPreferences();
    }
  }, [activeSection]);

  const loadNotifPreferences = async () => {
    try {
      setNotifLoading(true);
      const prefs = await notificationPreferenceApi.getMyPreferences();
      setNotifPrefs(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotifUpdate = async (updates: UpdateNotificationPreferencesData) => {
    if (!notifPrefs) return;
    try {
      setNotifSaving(true);
      const updated = await notificationPreferenceApi.updatePreferences(updates);
      setNotifPrefs(updated);
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleNotifReset = async () => {
    if (!confirm(t('settings.notifications.confirmReset'))) return;
    try {
      setNotifSaving(true);
      const reset = await notificationPreferenceApi.resetToDefault();
      setNotifPrefs(reset);
    } catch (error) {
      console.error('Failed to reset notification preferences:', error);
    } finally {
      setNotifSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`erp-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, String(value));

    if (key === 'language') {
      localStorage.setItem('erp-language', value);
      i18n.changeLanguage(value);
    }
    if (key === 'largerText') {
      document.documentElement.classList.toggle('text-lg', value);
    }
    if (key === 'highContrast') {
      document.documentElement.classList.toggle('high-contrast', value);
    }
    if (key === 'reducedMotion') {
      document.documentElement.classList.toggle('reduce-motion', value);
    }
  };

  const sections = [
    { id: 'appearance', name: t('settings.appearance.title'), icon: Palette, description: t('settings.appearance.description') },
    { id: 'notifications', name: t('settings.notifications.title'), icon: Bell, description: t('settings.notifications.description') },
    { id: 'privacy', name: t('settings.privacy.title'), icon: Shield, description: t('settings.privacy.description') },
    { id: 'accessibility', name: t('settings.accessibility.title'), icon: Accessibility, description: t('settings.accessibility.description') },
    { id: 'language', name: t('settings.language.title'), icon: Globe, description: t('settings.language.description') },
  ];

  const themeOptions = [
    { value: 'light', label: t('settings.appearance.light'), icon: Sun, description: t('settings.appearance.lightDesc') },
    { value: 'dark', label: t('settings.appearance.dark'), icon: Moon, description: t('settings.appearance.darkDesc') },
    { value: 'system', label: t('settings.appearance.system'), icon: Monitor, description: t('settings.appearance.systemDesc') },
  ];

  const languages = [
    { value: 'pl', label: 'Polski', flag: '🇵🇱' },
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  ];

  const dateFormats = [
    { value: 'DD.MM.YYYY', label: '31.12.2024', example: 'DD.MM.YYYY' },
    { value: 'MM/DD/YYYY', label: '12/31/2024', example: 'MM/DD/YYYY' },
    { value: 'YYYY-MM-DD', label: '2024-12-31', example: 'YYYY-MM-DD' },
  ];

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.appearance.theme')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{option.label}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{option.description}</p>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
          {t('settings.appearance.currentTheme')}: <span className="font-medium">{actualTheme === 'dark' ? t('settings.appearance.dark') : t('settings.appearance.light')}</span>
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.appearance.display')}</h3>
        <div className="space-y-3">
          <SettingToggle
            label={t('settings.appearance.compactMode')}
            description={t('settings.appearance.compactModeDesc')}
            checked={settings.compactMode}
            onChange={(v) => updateSetting('compactMode', v)}
          />
          <SettingToggle
            label={t('settings.appearance.showAvatars')}
            description={t('settings.appearance.showAvatarsDesc')}
            checked={settings.showAvatars}
            onChange={(v) => updateSetting('showAvatars', v)}
          />
          <SettingToggle
            label={t('settings.appearance.animations')}
            description={t('settings.appearance.animationsDesc')}
            checked={settings.animationsEnabled}
            onChange={(v) => updateSetting('animationsEnabled', v)}
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => {
    if (notifLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!notifPrefs) {
      return (
        <div className="text-center py-12">
          <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">{t('settings.notifications.loadError')}</p>
          <button
            onClick={loadNotifPreferences}
            className="mt-3 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {t('settings.notifications.retry')}
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Sound Settings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.notifications.sound')}</h3>
          <div className="space-y-3">
            <SettingToggle
              label={t('settings.notifications.enableSounds')}
              description={t('settings.notifications.enableSoundsDesc')}
              checked={notifPrefs.sound_enabled}
              onChange={(v) => handleNotifUpdate({ sound_enabled: v })}
              icon={<Volume2 className="w-5 h-5" />}
            />
            {notifPrefs.sound_enabled && (
              <>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">{t('settings.notifications.soundType')}</label>
                  <select
                    value={notifPrefs.sound_type}
                    onChange={(e) => handleNotifUpdate({ sound_type: e.target.value })}
                    disabled={notifSaving}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="default">{t('settings.notifications.soundDefault')}</option>
                    <option value="chime">{t('settings.notifications.soundChime')}</option>
                    <option value="bell">{t('settings.notifications.soundBell')}</option>
                    <option value="pop">{t('settings.notifications.soundPop')}</option>
                    <option value="none">{t('settings.notifications.soundNone')}</option>
                  </select>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">
                    {t('settings.notifications.volume')}: {notifPrefs.sound_volume}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={notifPrefs.sound_volume}
                    onChange={(e) => handleNotifUpdate({ sound_volume: parseInt(e.target.value) })}
                    disabled={notifSaving}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Visual Settings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.notifications.visual')}</h3>
          <div className="space-y-3">
            <SettingToggle
              label={t('settings.notifications.desktopNotifications')}
              description={t('settings.notifications.desktopNotificationsDesc')}
              checked={notifPrefs.desktop_notifications}
              onChange={(v) => handleNotifUpdate({ desktop_notifications: v })}
              icon={<Smartphone className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.showPreview')}
              description={t('settings.notifications.showPreviewDesc')}
              checked={notifPrefs.show_preview}
              onChange={(v) => handleNotifUpdate({ show_preview: v })}
              icon={<Eye className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.badgeCount')}
              description={t('settings.notifications.badgeCountDesc')}
              checked={notifPrefs.badge_count}
              onChange={(v) => handleNotifUpdate({ badge_count: v })}
              icon={<Bell className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Notification Types */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.notifications.types')}</h3>
          <div className="space-y-3">
            <SettingToggle
              label={t('settings.notifications.messages')}
              description={t('settings.notifications.messagesDesc')}
              checked={notifPrefs.notify_messages}
              onChange={(v) => handleNotifUpdate({ notify_messages: v })}
              icon={<MessageSquare className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.mentions')}
              description={t('settings.notifications.mentionsDesc')}
              checked={notifPrefs.notify_mentions}
              onChange={(v) => handleNotifUpdate({ notify_mentions: v })}
              icon={<AtSign className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.leaveStatus')}
              description={t('settings.notifications.leaveStatusDesc')}
              checked={notifPrefs.notify_leave_status}
              onChange={(v) => handleNotifUpdate({ notify_leave_status: v })}
              icon={<Briefcase className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.timeReminders')}
              description={t('settings.notifications.timeRemindersDesc')}
              checked={notifPrefs.notify_time_reminders}
              onChange={(v) => handleNotifUpdate({ notify_time_reminders: v })}
              icon={<Timer className="w-5 h-5" />}
            />
            <SettingToggle
              label={t('settings.notifications.systemUpdates')}
              description={t('settings.notifications.systemUpdatesDesc')}
              checked={notifPrefs.notify_system_updates}
              onChange={(v) => handleNotifUpdate({ notify_system_updates: v })}
              icon={<SettingsIcon className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* DND */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.notifications.dnd')}</h3>
          <div className="space-y-3">
            <SettingToggle
              label={t('settings.notifications.enableDnd')}
              description={t('settings.notifications.enableDndDesc')}
              checked={notifPrefs.dnd_enabled}
              onChange={(v) => handleNotifUpdate({ dnd_enabled: v })}
              icon={<BellOff className="w-5 h-5" />}
            />
            {notifPrefs.dnd_enabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">{t('settings.notifications.dndFrom')}</label>
                  <input
                    type="time"
                    value={notifPrefs.dnd_start_time || ''}
                    onChange={(e) => handleNotifUpdate({ dnd_start_time: e.target.value + ':00' })}
                    disabled={notifSaving}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <label className="block font-medium text-gray-900 dark:text-white mb-2">{t('settings.notifications.dndTo')}</label>
                  <input
                    type="time"
                    value={notifPrefs.dnd_end_time || ''}
                    onChange={(e) => handleNotifUpdate({ dnd_end_time: e.target.value + ':00' })}
                    disabled={notifSaving}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleNotifReset}
            disabled={notifSaving}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {t('settings.notifications.resetDefaults')}
          </button>
        </div>
      </div>
    );
  };

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.privacy.visibility')}</h3>
        <div className="space-y-3">
          <SettingToggle
            label={t('settings.privacy.showOnlineStatus')}
            description={t('settings.privacy.showOnlineStatusDesc')}
            checked={settings.showOnlineStatus}
            onChange={(v) => updateSetting('showOnlineStatus', v)}
            icon={<Eye className="w-5 h-5" />}
          />
          <SettingToggle
            label={t('settings.privacy.showLastSeen')}
            description={t('settings.privacy.showLastSeenDesc')}
            checked={settings.showLastSeen}
            onChange={(v) => updateSetting('showLastSeen', v)}
            icon={<Clock className="w-5 h-5" />}
          />
          <SettingToggle
            label={t('settings.privacy.readReceipts')}
            description={t('settings.privacy.readReceiptsDesc')}
            checked={settings.showReadReceipts}
            onChange={(v) => updateSetting('showReadReceipts', v)}
            icon={<Check className="w-5 h-5" />}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.privacy.profile')}</h3>
        <a
          href="/profile"
          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('settings.privacy.editProfile')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.privacy.editProfileDesc')}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </a>
      </div>
    </div>
  );

  const renderAccessibilitySection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.accessibility.access')}</h3>
        <div className="space-y-3">
          <SettingToggle
            label={t('settings.accessibility.highContrast')}
            description={t('settings.accessibility.highContrastDesc')}
            checked={settings.highContrast}
            onChange={(v) => updateSetting('highContrast', v)}
          />
          <SettingToggle
            label={t('settings.accessibility.reducedMotion')}
            description={t('settings.accessibility.reducedMotionDesc')}
            checked={settings.reducedMotion}
            onChange={(v) => updateSetting('reducedMotion', v)}
          />
          <SettingToggle
            label={t('settings.accessibility.largerText')}
            description={t('settings.accessibility.largerTextDesc')}
            checked={settings.largerText}
            onChange={(v) => updateSetting('largerText', v)}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.accessibility.navigation')}</h3>
        <div className="space-y-3">
          <SettingToggle
            label={t('settings.accessibility.keyboardShortcuts')}
            description={t('settings.accessibility.keyboardShortcutsDesc')}
            checked={settings.keyboardShortcuts}
            onChange={(v) => updateSetting('keyboardShortcuts', v)}
            icon={<Keyboard className="w-5 h-5" />}
          />
        </div>

        {settings.keyboardShortcuts && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('settings.accessibility.popularShortcuts')}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.accessibility.openSearch')}</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono">Ctrl + K</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.accessibility.newMessage')}</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono">Ctrl + N</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t('settings.accessibility.goToChat')}</span>
                <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono">Ctrl + 1</kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLanguageSection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.language.lang')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => updateSetting('language', lang.value)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                settings.language === lang.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium text-gray-900 dark:text-white">{lang.label}</span>
              {settings.language === lang.value && (
                <Check className="w-5 h-5 text-blue-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.language.dateFormat')}</h3>
        <div className="space-y-2">
          {dateFormats.map((format) => (
            <button
              key={format.value}
              onClick={() => updateSetting('dateFormat', format.value)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                settings.dateFormat === format.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-white">{format.label}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">({format.example})</span>
              </div>
              {settings.dateFormat === format.value && (
                <Check className="w-5 h-5 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.language.timeFormat')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateSetting('timeFormat', '24h')}
            className={`p-4 rounded-xl border-2 transition-all ${
              settings.timeFormat === '24h'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className="font-semibold text-gray-900 dark:text-white">{t('settings.language.24h')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">14:30</p>
          </button>
          <button
            onClick={() => updateSetting('timeFormat', '12h')}
            className={`p-4 rounded-xl border-2 transition-all ${
              settings.timeFormat === '12h'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className="font-semibold text-gray-900 dark:text-white">{t('settings.language.12h')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">2:30 PM</p>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('settings.language.firstDay')}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateSetting('firstDayOfWeek', 'monday')}
            className={`p-4 rounded-xl border-2 transition-all ${
              settings.firstDayOfWeek === 'monday'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className="font-semibold text-gray-900 dark:text-white">{t('settings.language.monday')}</p>
          </button>
          <button
            onClick={() => updateSetting('firstDayOfWeek', 'sunday')}
            className={`p-4 rounded-xl border-2 transition-all ${
              settings.firstDayOfWeek === 'sunday'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <p className="font-semibold text-gray-900 dark:text-white">{t('settings.language.sunday')}</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return renderAppearanceSection();
      case 'notifications':
        return renderNotificationsSection();
      case 'privacy':
        return renderPrivacySection();
      case 'accessibility':
        return renderAccessibilitySection();
      case 'language':
        return renderLanguageSection();
      default:
        return renderAppearanceSection();
    }
  };

  return (
    <MainLayout title={t('settings.title')}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">{t('settings.title')}</h2>
              </div>
              <nav className="p-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id as SettingsSection)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{section.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{section.description}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {sections.find(s => s.id === activeSection)?.name}
              </h2>
              {renderSection()}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Toggle component for settings
interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon?: React.ReactNode;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ label, description, checked, onChange, icon }) => {
  return (
    <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-300">
            {icon}
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-blue-500 peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 transition-colors"></div>
        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
      </div>
    </label>
  );
};

export default Settings;
