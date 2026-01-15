import { User } from './user.types';

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  metadata?: any;
  user?: User;
  created_at: string;
}
