import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import { AppDataSource } from '../config/database';
import { EmailAccount } from '../models/EmailAccount.model';
import { encryptSecret, decryptSecret } from '../utils/crypto.util';

interface AccountDto {
  email: string;
  display_name?: string;
  username?: string;
  password: string;
  imap_host: string;
  imap_port?: number;
  imap_secure?: boolean;
  smtp_host: string;
  smtp_port?: number;
  smtp_secure?: boolean;
}

export interface SendMailDto {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}

/** Reject a promise if it doesn't settle within `ms` — so nothing hangs forever. */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);
}

// Reusable IMAP connections, keyed by account id. Reconnecting + logging in on
// every request (TLS handshake + AUTH) is the slow part; keeping the connection
// warm and reusing it makes folder/message loads dramatically faster. Each
// connection is closed after a short idle period. Operations on one account are
// serialised (one IMAP connection can't safely run two ops at once).
interface PooledImap { client: ImapFlow; idleTimer: NodeJS.Timeout; }
const imapPool = new Map<string, PooledImap>();
const imapQueue = new Map<string, Promise<unknown>>();
const IMAP_IDLE_MS = 120_000;

function evictImap(accountId: string) {
  const p = imapPool.get(accountId);
  if (!p) return;
  clearTimeout(p.idleTimer);
  imapPool.delete(accountId);
  p.client.logout().catch(() => {});
}

// Public (safe) shape of an account — never includes the password.
function sanitize(a: EmailAccount) {
  return {
    id: a.id,
    email: a.email,
    display_name: a.display_name,
    username: a.username,
    imap_host: a.imap_host,
    imap_port: a.imap_port,
    imap_secure: a.imap_secure,
    smtp_host: a.smtp_host,
    smtp_port: a.smtp_port,
    smtp_secure: a.smtp_secure,
    is_active: a.is_active,
    last_checked_at: a.last_checked_at,
    created_at: a.created_at,
  };
}

export class EmailService {
  private repo = AppDataSource.getRepository(EmailAccount);

  // ── Account management ──────────────────────────────────────────────────────
  async listAccounts(userId: string) {
    const accounts = await this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'ASC' },
    });
    return accounts.map(sanitize);
  }

  private async getOwned(id: string, userId: string): Promise<EmailAccount> {
    const account = await this.repo.findOne({ where: { id, user_id: userId } });
    if (!account) throw new Error('Konto pocztowe nie znalezione');
    return account;
  }

  /**
   * Verify IMAP (required — needed to read mail) and SMTP (best-effort — some
   * hosts like Render block outbound SMTP, so a failed SMTP test must NOT prevent
   * connecting the mailbox; we just warn). Hard timeouts so it never hangs.
   */
  private async verifyConnection(params: {
    imap_host: string; imap_port: number; imap_secure: boolean;
    smtp_host: string; smtp_port: number; smtp_secure: boolean;
    username: string; password: string;
  }): Promise<{ smtpOk: boolean; smtpError?: string }> {
    const client = new ImapFlow({
      host: params.imap_host,
      port: params.imap_port,
      secure: params.imap_secure,
      auth: { user: params.username, pass: params.password },
      logger: false,
    });
    try {
      await withTimeout(client.connect(), 20000, 'Przekroczono czas połączenia z serwerem IMAP');
    } catch (e: any) {
      throw new Error(`Nie udało się połączyć z IMAP: ${e.message || e}`);
    } finally {
      await client.logout().catch(() => {});
    }

    const transporter = nodemailer.createTransport({
      host: params.smtp_host,
      port: params.smtp_port,
      secure: params.smtp_secure,
      auth: { user: params.username, pass: params.password },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    try {
      await withTimeout(transporter.verify(), 18000, 'Przekroczono czas połączenia z serwerem SMTP');
      return { smtpOk: true };
    } catch (e: any) {
      return { smtpOk: false, smtpError: e.message || String(e) };
    }
  }

  async addAccount(userId: string, dto: AccountDto) {
    if (!dto.email?.trim()) throw new Error('Adres e-mail jest wymagany');
    if (!dto.password) throw new Error('Hasło jest wymagane');
    if (!dto.imap_host?.trim() || !dto.smtp_host?.trim()) throw new Error('Adresy serwerów są wymagane');

    const username = (dto.username || dto.email).trim();
    const params = {
      imap_host: dto.imap_host.trim(),
      imap_port: dto.imap_port ?? 993,
      imap_secure: dto.imap_secure ?? true,
      smtp_host: dto.smtp_host.trim(),
      smtp_port: dto.smtp_port ?? 465,
      smtp_secure: dto.smtp_secure ?? true,
      username,
      password: dto.password,
    };

    const { smtpOk, smtpError } = await this.verifyConnection(params);

    const account = this.repo.create({
      user_id: userId,
      email: dto.email.trim(),
      display_name: dto.display_name?.trim() || null,
      username,
      password_encrypted: encryptSecret(dto.password),
      imap_host: params.imap_host,
      imap_port: params.imap_port,
      imap_secure: params.imap_secure,
      smtp_host: params.smtp_host,
      smtp_port: params.smtp_port,
      smtp_secure: params.smtp_secure,
      is_active: true,
      last_checked_at: new Date(),
    });
    await this.repo.save(account);
    return {
      ...sanitize(account),
      smtpOk,
      smtpWarning: smtpOk
        ? null
        : `Połączono ze skrzynką (odbieranie działa), ale test wysyłki (SMTP) się nie powiódł: ${smtpError}. Wysyłanie maili może nie działać z tego serwera.`,
    };
  }

  async deleteAccount(id: string, userId: string): Promise<void> {
    const account = await this.getOwned(id, userId);
    evictImap(id);
    await this.repo.remove(account);
  }

  // ── IMAP helpers ────────────────────────────────────────────────────────────
  private scheduleImapIdle(accountId: string) {
    const p = imapPool.get(accountId);
    if (!p) return;
    clearTimeout(p.idleTimer);
    p.idleTimer = setTimeout(() => evictImap(accountId), IMAP_IDLE_MS);
  }

  /** Get a warm, reusable IMAP connection for the account (creating one if needed). */
  private async ensureImap(account: EmailAccount): Promise<ImapFlow> {
    const existing = imapPool.get(account.id);
    if (existing && existing.client.usable) return existing.client;
    if (existing) evictImap(account.id);

    const client = new ImapFlow({
      host: account.imap_host,
      port: account.imap_port,
      secure: account.imap_secure,
      auth: { user: account.username, pass: decryptSecret(account.password_encrypted) },
      logger: false,
    });
    await withTimeout(client.connect(), 25000, 'Przekroczono czas połączenia z serwerem IMAP');
    const pooled: PooledImap = { client, idleTimer: setTimeout(() => evictImap(account.id), IMAP_IDLE_MS) };
    imapPool.set(account.id, pooled);
    client.on('error', () => evictImap(account.id));
    client.on('close', () => { const p = imapPool.get(account.id); if (p?.client === client) { clearTimeout(p.idleTimer); imapPool.delete(account.id); } });
    return client;
  }

  /** Run an IMAP operation on a pooled connection; serialised per account. */
  private withImap<T>(account: EmailAccount, fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    const prev = imapQueue.get(account.id) || Promise.resolve();
    const run = prev.catch(() => {}).then(async () => {
      const client = await this.ensureImap(account);
      try {
        const result = await fn(client);
        this.scheduleImapIdle(account.id);
        return result;
      } catch (e) {
        const p = imapPool.get(account.id);
        if (p && !p.client.usable) evictImap(account.id);
        throw e;
      }
    });
    imapQueue.set(account.id, run.catch(() => {}));
    return run;
  }

  /** List mailboxes/folders for an account. */
  async listFolders(accountId: string, userId: string) {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const list = await client.list();
      return list.map((f) => ({
        path: f.path,
        name: f.name,
        specialUse: f.specialUse || null,
        subscribed: f.subscribed,
      }));
    });
  }

  /** List messages in a folder (newest first), paginated by sequence range. */
  async listMessages(accountId: string, userId: string, folder: string, page = 1, pageSize = 30) {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const total = (client.mailbox as any)?.exists ?? 0;
        if (total === 0) return { messages: [], total, page, pageSize };

        const end = total - (page - 1) * pageSize;
        const start = Math.max(1, end - pageSize + 1);
        if (end < 1) return { messages: [], total, page, pageSize };

        const messages: any[] = [];
        for await (const msg of client.fetch(`${start}:${end}`, {
          uid: true,
          envelope: true,
          flags: true,
          internalDate: true,
          size: true,
          bodyStructure: true,
        })) {
          const flags = msg.flags || new Set<string>();
          const hasAttachments = !!(msg.bodyStructure && JSON.stringify(msg.bodyStructure).includes('attachment'));
          messages.push({
            uid: msg.uid,
            subject: msg.envelope?.subject || '(bez tematu)',
            from: msg.envelope?.from?.map((a) => ({ name: a.name, address: a.address })) || [],
            to: msg.envelope?.to?.map((a) => ({ name: a.name, address: a.address })) || [],
            date: msg.envelope?.date || msg.internalDate || null,
            seen: flags.has('\\Seen'),
            flagged: flags.has('\\Flagged'),
            answered: flags.has('\\Answered'),
            size: msg.size || 0,
            hasAttachments,
          });
        }
        messages.reverse(); // newest first
        return { messages, total, page, pageSize };
      } finally {
        lock.release();
      }
    });
  }

  /** Fetch and parse a single message; marks it as seen. */
  async getMessage(accountId: string, userId: string, folder: string, uid: number) {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true, flags: true }, { uid: true });
        if (!msg || !msg.source) throw new Error('Wiadomość nie znaleziona');
        const parsed = await simpleParser(msg.source);

        // Mark as read
        try { await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }); } catch { /* ignore */ }

        return {
          uid,
          subject: parsed.subject || '(bez tematu)',
          from: parsed.from?.value?.map((a) => ({ name: a.name, address: a.address })) || [],
          to: (parsed.to as any)?.value?.map((a: any) => ({ name: a.name, address: a.address })) || [],
          cc: (parsed.cc as any)?.value?.map((a: any) => ({ name: a.name, address: a.address })) || [],
          date: parsed.date || null,
          messageId: parsed.messageId || null,
          html: parsed.html || null,
          text: parsed.text || null,
          attachments: (parsed.attachments || []).map((att, idx) => ({
            index: idx,
            filename: att.filename || `zalacznik-${idx + 1}`,
            contentType: att.contentType,
            size: att.size,
          })),
        };
      } finally {
        lock.release();
      }
    });
  }

  /** Return a single attachment's bytes (re-parses the source). */
  async getAttachment(accountId: string, userId: string, folder: string, uid: number, index: number) {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) throw new Error('Wiadomość nie znaleziona');
        const parsed = await simpleParser(msg.source);
        const att = (parsed.attachments || [])[index];
        if (!att) throw new Error('Załącznik nie znaleziony');
        return {
          filename: att.filename || `zalacznik-${index + 1}`,
          contentType: att.contentType || 'application/octet-stream',
          content: att.content as Buffer,
        };
      } finally {
        lock.release();
      }
    });
  }

  /** Flag actions: mark seen/unseen, flagged, delete. */
  async setFlags(accountId: string, userId: string, folder: string, uid: number, action: 'seen' | 'unseen' | 'flag' | 'unflag') {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        const u = String(uid);
        if (action === 'seen') await client.messageFlagsAdd(u, ['\\Seen'], { uid: true });
        else if (action === 'unseen') await client.messageFlagsRemove(u, ['\\Seen'], { uid: true });
        else if (action === 'flag') await client.messageFlagsAdd(u, ['\\Flagged'], { uid: true });
        else if (action === 'unflag') await client.messageFlagsRemove(u, ['\\Flagged'], { uid: true });
        return { ok: true };
      } finally {
        lock.release();
      }
    });
  }

  async deleteMessage(accountId: string, userId: string, folder: string, uid: number) {
    const account = await this.getOwned(accountId, userId);
    return this.withImap(account, async (client) => {
      const lock = await client.getMailboxLock(folder);
      try {
        await client.messageDelete(String(uid), { uid: true });
        return { ok: true };
      } finally {
        lock.release();
      }
    });
  }

  // ── SMTP send ───────────────────────────────────────────────────────────────
  async sendMail(
    accountId: string,
    userId: string,
    dto: SendMailDto,
    files?: Express.Multer.File[],
  ) {
    const account = await this.getOwned(accountId, userId);
    if (!dto.to?.trim()) throw new Error('Pole „Do" jest wymagane');

    const transporter = nodemailer.createTransport({
      host: account.smtp_host,
      port: account.smtp_port,
      secure: account.smtp_secure,
      auth: { user: account.username, pass: decryptSecret(account.password_encrypted) },
      connectionTimeout: 20000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
    });

    const attachments = (files || []).map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    const fromName = account.display_name || account.email;
    try {
      await withTimeout(
        transporter.sendMail({
          from: { name: fromName, address: account.email },
          to: dto.to,
          cc: dto.cc || undefined,
          bcc: dto.bcc || undefined,
          subject: dto.subject || '(bez tematu)',
          text: dto.text || undefined,
          html: dto.html || undefined,
          inReplyTo: dto.inReplyTo || undefined,
          references: dto.references || undefined,
          attachments,
        }),
        60000,
        'Przekroczono czas wysyłki (serwer SMTP nie odpowiada — możliwa blokada portu)',
      );
    } catch (e: any) {
      throw new Error(`Nie udało się wysłać: ${e.message || e}`);
    }

    return { ok: true };
  }
}

export default new EmailService();
