import crypto from 'crypto';

/**
 * Symmetric encryption for sensitive data we must be able to read back
 * (e.g. mailbox passwords for IMAP/SMTP). AES-256-GCM with a key derived from
 * MAIL_ENCRYPTION_KEY (falls back to JWT_SECRET so it works without extra config,
 * but a dedicated key is strongly recommended in production).
 */
const rawSecret =
  process.env.MAIL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'dev-insecure-fallback-key';

if (!process.env.MAIL_ENCRYPTION_KEY && !process.env.JWT_SECRET) {
  console.warn('⚠️  No MAIL_ENCRYPTION_KEY / JWT_SECRET set — using an insecure fallback key for mailbox passwords.');
}

// Derive a stable 32-byte key from whatever secret we have.
const KEY = crypto.createHash('sha256').update(rawSecret).digest();
const IV_LENGTH = 12; // GCM standard
const ALGO = 'aes-256-gcm';

/** Encrypt a UTF-8 string → base64( iv | authTag | ciphertext ). */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

/** Reverse of encryptSecret. Throws if the payload is tampered/invalid. */
export function decryptSecret(payload: string): string {
  const data = Buffer.from(payload, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
