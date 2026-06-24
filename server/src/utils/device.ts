/** Classify the device from a browser User-Agent string. */
export function detectDevice(ua?: string): 'mobile' | 'tablet' | 'desktop' | undefined {
  if (!ua) return undefined;
  // Tablets first: iPad, or Android without the "Mobile" token.
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobile))/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}
