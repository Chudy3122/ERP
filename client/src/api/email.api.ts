import apiClient from './client';
import {
  EmailAccount, AddAccountDto, MailFolder, MessageList, MessageDetail,
} from '../types/email.types';

export const listAccounts = async (): Promise<EmailAccount[]> => {
  const res = await apiClient.get('/email/accounts');
  return res.data;
};

export const addAccount = async (dto: AddAccountDto): Promise<EmailAccount> => {
  const res = await apiClient.post('/email/accounts', dto);
  return res.data;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await apiClient.delete(`/email/accounts/${id}`);
};

export const listFolders = async (accountId: string): Promise<MailFolder[]> => {
  const res = await apiClient.get(`/email/accounts/${accountId}/folders`);
  return res.data;
};

export const listMessages = async (
  accountId: string, folder: string, page = 1, pageSize = 30,
): Promise<MessageList> => {
  const res = await apiClient.get(`/email/accounts/${accountId}/messages`, {
    params: { folder, page, pageSize },
  });
  return res.data;
};

export const getMessage = async (
  accountId: string, folder: string, uid: number,
): Promise<MessageDetail> => {
  const res = await apiClient.get(`/email/accounts/${accountId}/messages/${uid}`, {
    params: { folder },
  });
  return res.data;
};

export const attachmentUrl = (accountId: string, folder: string, uid: number, index: number): string =>
  `/email/accounts/${accountId}/messages/${uid}/attachments/${index}?folder=${encodeURIComponent(folder)}`;

export const downloadAttachment = async (
  accountId: string, folder: string, uid: number, index: number, filename: string,
): Promise<void> => {
  const res = await apiClient.get(attachmentUrl(accountId, folder, uid, index), { responseType: 'blob' });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const setFlags = async (
  accountId: string, folder: string, uid: number, action: 'seen' | 'unseen' | 'flag' | 'unflag',
): Promise<void> => {
  await apiClient.post(`/email/accounts/${accountId}/messages/${uid}/flags`, { action }, {
    params: { folder },
  });
};

export const deleteMessage = async (accountId: string, folder: string, uid: number): Promise<void> => {
  await apiClient.delete(`/email/accounts/${accountId}/messages/${uid}`, { params: { folder } });
};

export interface SendMailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: File[];
}

export const sendMail = async (accountId: string, payload: SendMailPayload): Promise<void> => {
  const form = new FormData();
  form.append('to', payload.to);
  if (payload.cc) form.append('cc', payload.cc);
  if (payload.bcc) form.append('bcc', payload.bcc);
  if (payload.subject) form.append('subject', payload.subject);
  if (payload.text) form.append('text', payload.text);
  if (payload.html) form.append('html', payload.html);
  if (payload.inReplyTo) form.append('inReplyTo', payload.inReplyTo);
  if (payload.references) form.append('references', payload.references);
  (payload.attachments || []).forEach((f) => form.append('attachments', f));
  await apiClient.post(`/email/accounts/${accountId}/send`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
