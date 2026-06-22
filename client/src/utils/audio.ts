// Shared audio utility — creates audio elements once and reuses them.
// Browsers block autoplay until the user has interacted with the page.
// Call unlockAudio() on the first user click to "warm up" the elements.

const SOUND_PATH = '/sounds/gadu_gadu.mp3';
const NOTIFICATION_PREFS_STORAGE_KEY = 'erp-notification-audio-preferences';
const NOTIFICATION_MAX_VOLUME = 0.35;
const CALL_MAX_VOLUME = 0.45;

let notifAudio: HTMLAudioElement | null = null;
let callAudio: HTMLAudioElement | null = null;
let unlocked = false;

interface StoredNotificationAudioPreferences {
  sound_enabled?: boolean;
  sound_type?: string;
  sound_volume?: number;
}

const getStoredNotificationAudioPreferences = (): StoredNotificationAudioPreferences => {
  try {
    const storedValue = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    return storedValue ? JSON.parse(storedValue) : {};
  } catch {
    return {};
  }
};

const getScaledVolume = (volumePercent?: number, maxVolume = NOTIFICATION_MAX_VOLUME) => {
  const normalizedVolume = Math.max(0, Math.min(100, Number(volumePercent ?? 50))) / 100;

  return Math.pow(normalizedVolume, 2) * maxVolume;
};

export const syncNotificationAudioPreferences = (
  preferences: StoredNotificationAudioPreferences
): void => {
  localStorage.setItem(
    NOTIFICATION_PREFS_STORAGE_KEY,
    JSON.stringify({
      sound_enabled: preferences.sound_enabled,
      sound_type: preferences.sound_type,
      sound_volume: preferences.sound_volume,
    })
  );
};

const getNotifAudio = (): HTMLAudioElement => {
  if (!notifAudio) {
    notifAudio = new Audio(SOUND_PATH);
    notifAudio.preload = 'auto';
  }
  return notifAudio;
};

const getCallAudio = (): HTMLAudioElement => {
  if (!callAudio) {
    callAudio = new Audio(SOUND_PATH);
    callAudio.loop = true;
    callAudio.preload = 'auto';
  }
  return callAudio;
};

// Must be called from a user-gesture handler (click/keydown) to satisfy browser autoplay policy.
export const unlockAudio = (): void => {
  if (unlocked) return;
  unlocked = true;
  const a = getNotifAudio();
  a.volume = 0;
  a.play()
    .then(() => { a.pause(); a.currentTime = 0; })
    .catch(() => {});
  const c = getCallAudio();
  c.volume = 0;
  c.play()
    .then(() => { c.pause(); c.currentTime = 0; })
    .catch(() => {});
};

export const playNotificationSound = (): void => {
  const preferences = getStoredNotificationAudioPreferences();
  if (preferences.sound_enabled === false || preferences.sound_type === 'none') return;

  const audio = getNotifAudio();
  audio.volume = getScaledVolume(preferences.sound_volume);
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const playCallRingtone = (): void => {
  const preferences = getStoredNotificationAudioPreferences();
  if (preferences.sound_enabled === false || preferences.sound_type === 'none') return;

  const audio = getCallAudio();
  audio.volume = getScaledVolume(preferences.sound_volume, CALL_MAX_VOLUME);
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const stopCallRingtone = (): void => {
  const audio = getCallAudio();
  audio.pause();
  audio.currentTime = 0;
};
