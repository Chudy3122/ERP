import { client } from './client';
import { Vehicle, VehicleRequest, CreateVehicleRequestInput, FleetContext, VehicleInput } from '../types/fleet.types';

function vehicleFormData(input: VehicleInput): FormData {
  const form = new FormData();
  form.append('name', input.name);
  if (input.registration !== undefined) form.append('registration', input.registration);
  if (input.year != null) form.append('year', String(input.year));
  if (input.seats != null) form.append('seats', String(input.seats));
  if (input.fuel_type !== undefined) form.append('fuel_type', input.fuel_type);
  if (input.notes !== undefined) form.append('notes', input.notes);
  if (input.image) form.append('image', input.image);
  return form;
}

// NOTE: must set multipart/form-data explicitly — this axios instance defaults to
// application/json, which would make axios convert the FormData to JSON.
const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

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

export const createVehicle = async (input: VehicleInput): Promise<Vehicle> => {
  const res = await client.post('/fleet/vehicles', vehicleFormData(input), MULTIPART);
  return res.data;
};

export const updateVehicle = async (id: string, input: VehicleInput): Promise<Vehicle> => {
  const res = await client.put(`/fleet/vehicles/${id}`, vehicleFormData(input), MULTIPART);
  return res.data;
};

export const deleteVehicle = async (id: string): Promise<void> => {
  await client.delete(`/fleet/vehicles/${id}`);
};
