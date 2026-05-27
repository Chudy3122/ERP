// Shared audio utility — creates audio elements once and reuses them.
// Browsers block autoplay until the user has interacted with the page.
// Call unlockAudio() on the first user click to "warm up" the elements.

const SOUND_PATH = '/sounds/gadu_gadu.mp3';

let notifAudio: HTMLAudioElement | null = null;
let callAudio: HTMLAudioElement | null = null;
let unlocked = false;

const getNotifAudio = (): HTMLAudioElement => {
  if (!notifAudio) {
    notifAudio = new Audio(SOUND_PATH);
    notifAudio.volume = 0.5;
    notifAudio.preload = 'auto';
  }
  return notifAudio;
};

const getCallAudio = (): HTMLAudioElement => {
  if (!callAudio) {
    callAudio = new Audio(SOUND_PATH);
    callAudio.volume = 0.6;
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
  a.play()
    .then(() => { a.pause(); a.currentTime = 0; })
    .catch(() => {});
  const c = getCallAudio();
  c.play()
    .then(() => { c.pause(); c.currentTime = 0; })
    .catch(() => {});
};

export const playNotificationSound = (): void => {
  const audio = getNotifAudio();
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const playCallRingtone = (): void => {
  const audio = getCallAudio();
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

export const stopCallRingtone = (): void => {
  const audio = getCallAudio();
  audio.pause();
  audio.currentTime = 0;
};
