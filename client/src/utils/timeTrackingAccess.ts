const MOBILE_DEVICE_PATTERN =
  /mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/i;
const TABLET_DEVICE_PATTERN = /ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i;

const MOBILE_TIME_TRACKING_BLOCKED_EMAILS = ['aleksandra.nazar@itcomplete.pl'];

export const MOBILE_TIME_TRACKING_BLOCK_MESSAGE =
  'Rejestrowanie czasu pracy z telefonu jest wyłączone dla tego konta. Użyj komputera.';

export function isMobileOrTabletDevice(userAgent = navigator.userAgent) {
  return MOBILE_DEVICE_PATTERN.test(userAgent) || TABLET_DEVICE_PATTERN.test(userAgent);
}

export function isMobileTimeTrackingBlocked(email?: string | null) {
  return Boolean(
    email &&
      MOBILE_TIME_TRACKING_BLOCKED_EMAILS.includes(email.toLowerCase()) &&
      isMobileOrTabletDevice(),
  );
}
