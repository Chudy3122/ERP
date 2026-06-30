export type EntryType = 'meeting' | 'available' | 'blocked';

export interface BossCalendarEntry {
  id: string;
  date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  type: EntryType;
  location: string | null;
  participant_ids: string[];
  completed: boolean;
  completed_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateEntryPayload {
  date: string;
  end_date?: string | null;
  start_time: string;
  end_time: string;
  title: string;
  description?: string;
  type: EntryType;
  location?: string;
  participant_ids?: string[];
}
