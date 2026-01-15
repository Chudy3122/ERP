export interface MeetingParticipant {
  id: string;
  user_id: string;
  meeting_id: string;
  status: 'invited' | 'accepted' | 'rejected' | 'in_call';
  joined_at?: string;
  left_at?: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  started_at?: string;
  ended_at?: string;
  status: 'scheduled' | 'active' | 'ended';
  room_id: string;
  created_at: string;
  participants: MeetingParticipant[];
  creator: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  participant_ids: string[];
}

export interface IncomingCall {
  meeting_id: string;
  meeting_title: string;
  caller: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
  created_at: string;
}
