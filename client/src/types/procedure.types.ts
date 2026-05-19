export enum ProcedureStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface Procedure {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string | null;
  status: ProcedureStatus;
  version: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: { id: string; first_name: string; last_name: string };
  updater?: { id: string; first_name: string; last_name: string } | null;
}

export interface CreateProcedureRequest {
  title: string;
  description?: string;
  content: string;
  category?: string;
  status?: ProcedureStatus;
  version?: string;
}

export interface UpdateProcedureRequest extends Partial<CreateProcedureRequest> {}
