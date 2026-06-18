import { client } from './client';
import { Vehicle, VehicleRequest, CreateVehicleRequestInput, FleetContext } from '../types/fleet.types';

export const getContext = async (): Promise<FleetContext> => {
  const res = await client.get('/fleet/context');
  return res.data;
};

export const listRequests = async (status?: string): Promise<VehicleRequest[]> => {
  const res = await client.get('/fleet/requests', { params: { status } });
  return res.data;
};

export const createRequest = async (data: CreateVehicleRequestInput): Promise<VehicleRequest> => {
  const res = await client.post('/fleet/requests', data);
  return res.data;
};

export const assignVehicle = async (id: string, vehicleId: string, notes?: string): Promise<VehicleRequest> => {
  const res = await client.post(`/fleet/requests/${id}/assign`, { vehicleId, notes });
  return res.data;
};

export const rejectRequest = async (id: string, notes?: string): Promise<VehicleRequest> => {
  const res = await client.post(`/fleet/requests/${id}/reject`, { notes });
  return res.data;
};

export const deleteRequest = async (id: string): Promise<void> => {
  await client.delete(`/fleet/requests/${id}`);
};

export const createVehicle = async (name: string, registration?: string): Promise<Vehicle> => {
  const res = await client.post('/fleet/vehicles', { name, registration });
  return res.data;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await client.delete(`/fleet/vehicles/${id}`);
};
