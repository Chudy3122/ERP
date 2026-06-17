export interface EmailAccount {
  id: string;
  email: string;
  display_name: string | null;
  username: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string;
  // Present only in the add-account response: SMTP test result.
  smtpOk?: boolean;
  smtpWarning?: string | null;
}

export interface AddAccountDto {
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

export interface MailFolder {
  path: string;
  name: string;
  specialUse: string | null;
  subscribed: boolean;
}

export interface MailAddress {
  name?: string;
  address?: string;
}

export interface MessageSummary {
  uid: number;
  subject: string;
  from: MailAddress[];
  to: MailAddress[];
  date: string | null;
  seen: boolean;
  flagged: boolean;
  answered: boolean;
  size: number;
  hasAttachments: boolean;
}

export interface MessageList {
  messages: MessageSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MessageAttachment {
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface MessageDetail {
  uid: number;
  subject: string;
  from: MailAddress[];
  to: MailAddress[];
  cc: MailAddress[];
  date: string | null;
  messageId: string | null;
  html: string | null;
  text: string | null;
  attachments: MessageAttachment[];
}
