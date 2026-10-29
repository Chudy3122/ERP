import { client } from './client';

export interface RemoteUserLite {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface RemoteDevice {
  id: string;
  user_id: string;
  label: string;
  rustdesk_id: string;
  access_password: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: RemoteUserLite | null;
}

export type RemoteSessionStatus = 'requested' | 'in_progress' | 'closed' | 'cancelled';

export interface RemoteSession {
  id: string;
  requester_id: string | null;
  helper_id: string | null;
  device_id: string | null;
  ticket_id: string | null;
  status: RemoteSessionStatus;
  reason: string | null;
  resolution_note: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  requester?: RemoteUserLite | null;
  helper?: RemoteUserLite | null;
  device?: RemoteDevice | null;
}

export interface DeviceInput {
  user_id: string;
  label?: string;
  rustdesk_id: string;
  access_password?: string | null;
  notes?: string | null;
}

export const getContext = async (): Promise<{ isIt: boolean }> => {
  const res = await client.get('/remote-support/context');
  return res.data;
};

// Devices (IT only)
export const listDevices = async (): Promise<RemoteDevice[]> => {
  const res = await client.get('/remote-support/devices');
  return res.data;
};

export const createDevice = async (input: DeviceInput): Promise<RemoteDevice> => {
  const res = await client.post('/remote-support/devices', input);
  return res.data;
};

export const updateDevice = async (id: string, input: Partial<DeviceInput>): Promise<RemoteDevice> => {
  const res = await client.put(`/remote-support/devices/${id}`, input);
  return res.data;
};

export const deleteDevice = async (id: string): Promise<void> => {
  await client.delete(`/remote-support/devices/${id}`);
};

// Sessions
export const listSessions = async (status?: RemoteSessionStatus): Promise<RemoteSession[]> => {
  const res = await client.get('/remote-support/sessions', { params: { status } });
  return res.data;
};

export const mySessions = async (): Promise<RemoteSession[]> => {
  const res = await client.get('/remote-support/sessions/mine');
  return res.data;
};

export const requestHelp = async (data: { reason?: string; ticket_id?: string; device_id?: string }): Promise<RemoteSession> => {
  const res = await client.post('/remote-support/sessions/request', data);
  return res.data;
};

export const startSession = async (data: { requester_id?: string; device_id?: string; ticket_id?: string; reason?: string }): Promise<RemoteSession> => {
  const res = await client.post('/remote-support/sessions', data);
  return res.data;
};

export const acceptSession = async (id: string, device_id?: string): Promise<RemoteSession> => {
  const res = await client.post(`/remote-support/sessions/${id}/accept`, { device_id });
  return res.data;
};

export const closeSession = async (id: string, resolution_note?: string): Promise<RemoteSession> => {
  const res = await client.post(`/remote-support/sessions/${id}/close`, { resolution_note });
  return res.data;
};

export const cancelSession = async (id: string): Promise<RemoteSession> => {
  const res = await client.post(`/remote-support/sessions/${id}/cancel`, {});
  return res.data;
};

/** Build the rustdesk:// deep link that opens the RustDesk client and starts a connection. */
export const buildRustDeskLink = (rustdeskId: string, password?: string | null): string => {
  const id = rustdeskId.replace(/\s/g, '');
  return password ? `rustdesk://connection/new/${id}?password=${encodeURIComponent(password)}` : `rustdesk://connection/new/${id}`;
};
