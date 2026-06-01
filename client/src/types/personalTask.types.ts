export type PersonalTaskStatus = 'todo' | 'in_progress' | 'done';

export interface PersonalTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: PersonalTaskStatus;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePersonalTask {
  title: string;
  description?: string;
  status?: PersonalTaskStatus;
}

export const PERSONAL_COLUMNS: { status: PersonalTaskStatus; label: string; color: string }[] = [
  { status: 'todo', label: 'Do zrobienia', color: '#6B7280' },
  { status: 'in_progress', label: 'W trakcie', color: '#F7941D' },
  { status: 'done', label: 'Zrobione', color: '#22c55e' },
];
