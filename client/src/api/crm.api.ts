import { client } from './client';
import {
  CrmPipeline,
  CrmDeal,
  CrmDealActivity,
  CreatePipelineRequest,
  CreateDealRequest,
  MoveDealRequest,
  DealFilters,
  DealStatistics,
  RevenueForecast,
  ConversionRate,
  CreateStageRequest,
  CreateActivityRequest,
  DealStatus,
} from '../types/crm.types';

// ── Pipelines ──

export const getAllPipelines = async (): Promise<CrmPipeline[]> => {
  const response = await client.get('/crm/pipelines');
  return response.data;
};

export const getPipelineById = async (id: string): Promise<CrmPipeline> => {
  const response = await client.get(`/crm/pipelines/${id}`);
  return response.data;
};

export const createPipeline = async (data: CreatePipelineRequest): Promise<CrmPipeline> => {
  const response = await client.post('/crm/pipelines', data);
  return response.data;
};

export const updatePipeline = async (id: string, data: Partial<CreatePipelineRequest>): Promise<CrmPipeline> => {
  const response = await client.put(`/crm/pipelines/${id}`, data);
  return response.data;
};

export const deletePipeline = async (id: string): Promise<void> => {
  await client.delete(`/crm/pipelines/${id}`);
};

// ── Stages ──

export const createStage = async (pipelineId: string, data: CreateStageRequest) => {
  const response = await client.post(`/crm/pipelines/${pipelineId}/stages`, data);
  return response.data;
};

export const updateStage = async (id: string, data: Partial<CreateStageRequest>) => {
  const response = await client.put(`/crm/stages/${id}`, data);
  return response.data;
};

export const deleteStage = async (id: string, moveDealsToStageId?: string) => {
  await client.delete(`/crm/stages/${id}`, { data: { moveDealsToStageId } });
};

export const reorderStages = async (pipelineId: string, ids: string[]) => {
  await client.post(`/crm/pipelines/${pipelineId}/stages/reorder`, { ids });
};

// ── Deals ──

export const getDealsByPipeline = async (pipelineId: string, filters?: DealFilters): Promise<Record<string, CrmDeal[]>> => {
  const response = await client.get(`/crm/pipelines/${pipelineId}/deals`, { params: filters });
  return response.data;
};

export const createDeal = async (data: CreateDealRequest): Promise<CrmDeal> => {
  const response = await client.post('/crm/deals', data);
  return response.data;
};

export const getDealById = async (id: string): Promise<CrmDeal> => {
  const response = await client.get(`/crm/deals/${id}`);
  return response.data;
};

export const updateDeal = async (id: string, data: Partial<CreateDealRequest>): Promise<CrmDeal> => {
  const response = await client.put(`/crm/deals/${id}`, data);
  return response.data;
};

export const moveDeal = async (id: string, data: MoveDealRequest): Promise<CrmDeal> => {
  const response = await client.patch(`/crm/deals/${id}/move`, data);
  return response.data;
};

export const updateDealStatus = async (id: string, status: DealStatus, lost_reason?: string): Promise<CrmDeal> => {
  const response = await client.patch(`/crm/deals/${id}/status`, { status, lost_reason });
  return response.data;
};

export const deleteDeal = async (id: string): Promise<void> => {
  await client.delete(`/crm/deals/${id}`);
};

export const getDealsForClient = async (clientId: string): Promise<CrmDeal[]> => {
  const response = await client.get(`/crm/clients/${clientId}/deals`);
  return response.data;
};

export const convertDealToInvoice = async (dealId: string) => {
  const response = await client.post(`/crm/deals/${dealId}/convert-to-invoice`);
  return response.data;
};

// ── Statistics ──

export const getStatistics = async (pipelineId?: string): Promise<DealStatistics> => {
  const response = await client.get('/crm/statistics', { params: { pipeline_id: pipelineId } });
  return response.data;
};

export const getForecast = async (pipelineId?: string): Promise<RevenueForecast[]> => {
  const response = await client.get('/crm/forecast', { params: { pipeline_id: pipelineId } });
  return response.data;
};

export const getConversionRates = async (pipelineId: string): Promise<ConversionRate[]> => {
  const response = await client.get('/crm/conversion-rates', { params: { pipeline_id: pipelineId } });
  return response.data;
};

// ── Activities ──

export const getDealActivities = async (dealId: string): Promise<CrmDealActivity[]> => {
  const response = await client.get(`/crm/deals/${dealId}/activities`);
  return response.data;
};

export const createDealActivity = async (dealId: string, data: CreateActivityRequest): Promise<CrmDealActivity> => {
  const response = await client.post(`/crm/deals/${dealId}/activities`, data);
  return response.data;
};

export const updateActivity = async (id: string, data: Partial<CreateActivityRequest>): Promise<CrmDealActivity> => {
  const response = await client.put(`/crm/activities/${id}`, data);
  return response.data;
};

export const deleteActivity = async (id: string): Promise<void> => {
  await client.delete(`/crm/activities/${id}`);
};

export const completeActivity = async (id: string): Promise<CrmDealActivity> => {
  const response = await client.patch(`/crm/activities/${id}/complete`);
  return response.data;
};

export const getFollowUps = async (userId?: string, days?: number): Promise<CrmDealActivity[]> => {
  const response = await client.get('/crm/follow-ups', { params: { user_id: userId, days } });
  return response.data;
};
