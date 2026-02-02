import React, { useState, useEffect } from 'react';
import * as notificationPreferenceApi from '../api/notificationPreference.api';
import type {
  NotificationPreference,
  UpdateNotificationPreferencesData,
} from '../api/notificationPreference.api';

const NotificationSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationPreferenceApi.getMyPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      alert('Nie udało się załadować ustawień powiadomień');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: UpdateNotificationPreferencesData) => {
    if (!preferences) return;

    try {
      setSaving(true);
      const updated = await notificationPreferenceApi.updatePreferences(updates);
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Nie udało się zaktualizować ustawień');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić ustawienia domyślne?')) return;

    try {
      setSaving(true);
      const reset = await notificationPreferenceApi.resetToDefault();
      setPreferences(reset);
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      alert('Nie udało się przywrócić ustawień domyślnych');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Ładowanie ustawień...</p>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-900 shadow-lg border-b border-slate-800">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shadow-md border border-slate-700">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-100">Ustawienia powiadomień</h1>
                <p className="text-sm text-slate-400">Dostosuj powiadomienia do swoich potrzeb</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/dashboard"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-all duration-200 text-sm font-medium text-slate-200 border border-slate-700"
              >
                ← Panel główny
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Sound Settings */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🔊</span>
            Powiadomienia dźwiękowe
          </h2>

          <div className="space-y-4">
            {/* Sound Enabled */}
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Włącz dźwięki</div>
                <div className="text-sm text-slate-600">Odtwarzaj dźwięk przy nowych powiadomieniach</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.sound_enabled}
                onChange={(e) => handleUpdate({ sound_enabled: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {/* Sound Type */}
            {preferences.sound_enabled && (
              <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                <label className="block font-semibold text-slate-900 mb-2">Typ dźwięku</label>
                <select
                  value={preferences.sound_type}
                  onChange={(e) => handleUpdate({ sound_type: e.target.value })}
                  disabled={saving}
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="default">Domyślny</option>
                  <option value="chime">Dzwonek</option>
                  <option value="bell">Dzwon</option>
                  <option value="pop">Pop</option>
                  <option value="none">Brak</option>
                </select>
              </div>
            )}

            {/* Sound Volume */}
            {preferences.sound_enabled && (
              <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                <label className="block font-semibold text-slate-900 mb-2">
                  Głośność: {preferences.sound_volume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={preferences.sound_volume}
                  onChange={(e) => handleUpdate({ sound_volume: parseInt(e.target.value) })}
                  disabled={saving}
                  className="w-full h-2 bg-slate-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Visual Settings */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            Powiadomienia wizualne
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Powiadomienia systemowe</div>
                <div className="text-sm text-slate-600">Wyświetlaj powiadomienia w systemie operacyjnym</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.desktop_notifications}
                onChange={(e) => handleUpdate({ desktop_notifications: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Podgląd wiadomości</div>
                <div className="text-sm text-slate-600">Pokaż treść wiadomości w powiadomieniu</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.show_preview}
                onChange={(e) => handleUpdate({ show_preview: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Licznik nieprzeczytanych</div>
                <div className="text-sm text-slate-600">Wyświetlaj liczbę nieprzeczytanych wiadomości</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.badge_count}
                onChange={(e) => handleUpdate({ badge_count: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📬</span>
            Typy powiadomień
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Wiadomości</div>
                <div className="text-sm text-slate-600">Powiadamiaj o nowych wiadomościach</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notify_messages}
                onChange={(e) => handleUpdate({ notify_messages: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Wzmianki</div>
                <div className="text-sm text-slate-600">Powiadamiaj, gdy ktoś Cię oznaczy</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notify_mentions}
                onChange={(e) => handleUpdate({ notify_mentions: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Status urlopu</div>
                <div className="text-sm text-slate-600">Powiadamiaj o zmianach statusu wniosków urlopowych</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notify_leave_status}
                onChange={(e) => handleUpdate({ notify_leave_status: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Przypomnienia czasu pracy</div>
                <div className="text-sm text-slate-600">Powiadamiaj o rozpoczęciu/zakończeniu pracy</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notify_time_reminders}
                onChange={(e) => handleUpdate({ notify_time_reminders: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Aktualizacje systemu</div>
                <div className="text-sm text-slate-600">Powiadamiaj o aktualizacjach i zmianach w systemie</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.notify_system_updates}
                onChange={(e) => handleUpdate({ notify_system_updates: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>
        </div>

        {/* Do Not Disturb */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-slate-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            Nie przeszkadzać (DND)
          </h2>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-100 transition-colors cursor-pointer">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Włącz tryb DND</div>
                <div className="text-sm text-slate-600">Wyłącz powiadomienia w określonych godzinach</div>
              </div>
              <input
                type="checkbox"
                checked={preferences.dnd_enabled}
                onChange={(e) => handleUpdate({ dnd_enabled: e.target.checked })}
                disabled={saving}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
              />
            </label>

            {preferences.dnd_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                  <label className="block font-semibold text-slate-900 mb-2">Od godziny</label>
                  <input
                    type="time"
                    value={preferences.dnd_start_time || ''}
                    onChange={(e) => handleUpdate({ dnd_start_time: e.target.value + ':00' })}
                    disabled={saving}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="p-4 bg-slate-50 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600">
                  <label className="block font-semibold text-slate-900 mb-2">Do godziny</label>
                  <input
                    type="time"
                    value={preferences.dnd_end_time || ''}
                    onChange={(e) => handleUpdate({ dnd_end_time: e.target.value + ':00' })}
                    disabled={saving}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-gray-600 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-3 bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 Przywróć ustawienia domyślne
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
