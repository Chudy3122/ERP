import nodemailer, { Transporter } from 'nodemailer';

// Generic SMTP sender. Point it at any existing mailbox via env vars — e.g. Gmail
// (smtp.gmail.com:465 + an App Password). No third-party SaaS required.
// If SMTP is not configured, sendEmail is a safe no-op so the app keeps working.
let transporter: Transporter | null = null;
let warned = false;

function getTransporter(): Transporter | null {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn('[email] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — e-mails are skipped.');
      warned = true;
    }
    return null;
  }
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}): Promise<void> {
  const tx = getTransporter();
  if (!tx) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await tx.sendMail({ from, to: opts.to, subject: opts.subject, text: opts.text, html: opts.html });
}
