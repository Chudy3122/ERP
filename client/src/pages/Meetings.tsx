import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import {
  Video,
  Plus,
  Users,
  X,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Search,
  Loader2,
  MonitorPlay,
  Globe,
  Link2,
  CalendarPlus,
  Trash2,
} from 'lucide-react';
import * as meetingApi from '../api/meeting.api';
import * as adminApi from '../api/admin.api';
import IncomingCallModal from '../components/meeting/IncomingCallModal';
import { AdminUser } from '../types/admin.types';

type MeetingPlatform = 'internal' | 'teams' | 'zoom' | 'google_meet';

interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  platform: MeetingPlatform;
  meeting_link?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  participants: { id: string; name: string }[];
  created_by: string;
  created_at: string;
}

const platformConfig: Record<MeetingPlatform, { name: string; color: string; bgColor: string; icon: string }> = {
  internal: { name: 'System ERP', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '🖥️' },
  teams: { name: 'Microsoft Teams', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: '🟣' },
  zoom: { name: 'Zoom', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🔵' },
  google_meet: { name: 'Google Meet', color: 'text-green-700', bgColor: 'bg-green-100', icon: '🟢' },
};

const Meetings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Internal meeting modal state
  const [showInternalModal, setShowInternalModal] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // External meeting modal state
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalPlatform, setExternalPlatform] = useState<MeetingPlatform>('teams');
  const [externalTitle, setExternalTitle] = useState('');
  const [externalDescription, setExternalDescription] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [externalDate, setExternalDate] = useState('');
  const [externalTime, setExternalTime] = useState('');
  const [externalDuration, setExternalDuration] = useState(60);
  const [externalParticipants, setExternalParticipants] = useState<string[]>([]);
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Scheduled meetings state
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Copied link state
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<{
    callerName: string;
    meetingTitle: string;
    meetingId: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
    loadScheduledMeetings();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getAllUsers(1, 1000);
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadScheduledMeetings = async () => {
    try {
      setIsLoadingMeetings(true);
      const meetings = await meetingApi.getScheduledMeetings();
      setScheduledMeetings(meetings);
    } catch (error) {
      console.error('Failed to load scheduled meetings:', error);
      // Mock data for now
      setScheduledMeetings([]);
    } finally {
      setIsLoadingMeetings(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleExternalParticipant = (userId: string) => {
    setExternalParticipants((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Internal meeting - start immediately
  const handleCreateInternalMeeting = async () => {
    if (!meetingTitle.trim() || selectedUsers.length === 0) {
      alert('Wprowadź tytuł spotkania i wybierz co najmniej jednego uczestnika');
      return;
    }

    try {
      setIsCreating(true);
      const meeting = await meetingApi.createMeeting({
        title: meetingTitle,
        description: meetingDescription,
        participant_ids: selectedUsers,
      });

      navigate(`/meeting/${meeting.room_id}`, {
        state: { meetingId: meeting.id },
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się utworzyć spotkania');
    } finally {
      setIsCreating(false);
    }
  };

  // External meeting - schedule for later
  const handleScheduleExternalMeeting = async () => {
    if (!externalTitle.trim() || !externalDate || !externalTime) {
      alert('Wprowadź tytuł, datę i godzinę spotkania');
      return;
    }

    try {
      setIsSaving(true);
      await meetingApi.scheduleExternalMeeting({
        title: externalTitle,
        description: externalDescription,
        platform: externalPlatform,
        meeting_link: externalLink,
        scheduled_date: externalDate,
        scheduled_time: externalTime,
        duration_minutes: externalDuration,
        participant_ids: externalParticipants,
      });

      setShowExternalModal(false);
      resetExternalForm();
      loadScheduledMeetings();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się zaplanować spotkania');
    } finally {
      setIsSaving(false);
    }
  };

  const resetExternalForm = () => {
    setExternalTitle('');
    setExternalDescription('');
    setExternalLink('');
    setExternalDate('');
    setExternalTime('');
    setExternalDuration(60);
    setExternalParticipants([]);
    setExternalSearchQuery('');
  };

  const resetInternalForm = () => {
    setMeetingTitle('');
    setMeetingDescription('');
    setSelectedUsers([]);
    setSearchQuery('');
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to spotkanie?')) return;

    try {
      await meetingApi.deleteScheduledMeeting(meetingId);
      loadScheduledMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
    }
  };

  const handleAcceptCall = () => {
    if (incomingCall) {
      navigate(`/meeting/${incomingCall.meetingId}`);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      meetingApi.rejectMeeting(incomingCall.meetingId);
      setIncomingCall(null);
    }
  };

  const filteredUsers = users.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredExternalUsers = users.filter((user) =>
    `${user.first_name} ${user.last_name} ${user.email}`
      .toLowerCase()
      .includes(externalSearchQuery.toLowerCase())
  );

  const now = new Date();
  const upcomingMeetings = scheduledMeetings.filter((m) => {
    const meetingDate = new Date(`${m.scheduled_date}T${m.scheduled_time}`);
    return meetingDate >= now;
  });
  const pastMeetings = scheduledMeetings.filter((m) => {
    const meetingDate = new Date(`${m.scheduled_date}T${m.scheduled_time}`);
    return meetingDate < now;
  });

  const displayedMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const formatMeetingDateTime = (date: string, time: string) => {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MainLayout title="Spotkania">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          meetingTitle={incomingCall.meetingTitle}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Spotkania</h1>
          <p className="text-gray-500">Organizuj spotkania wideo z zespołem lub korzystaj z zewnętrznych platform</p>
        </div>

        {/* Two main options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Internal Meeting Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center">
                <MonitorPlay className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Spotkanie wewnętrzne</h2>
                <p className="text-sm text-gray-500">
                  Rozpocznij natychmiastowe połączenie wideo w oknie aplikacji
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                <span>HD wideo i audio</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                <span>Udostępnianie ekranu</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                <span>Powiadomienia w czasie rzeczywistym</span>
              </div>
            </div>

            <button
              onClick={() => {
                resetInternalForm();
                setShowInternalModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition-colors"
            >
              <Video className="w-5 h-5" />
              Rozpocznij spotkanie
            </button>
          </div>

          {/* External Meeting Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center">
                <Globe className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Spotkanie zewnętrzne</h2>
                <p className="text-sm text-gray-500">
                  Zaplanuj spotkanie w Teams, Zoom lub Google Meet
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
                <span className="text-lg">🟣</span>
                <span className="text-sm font-medium text-indigo-700">Teams</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-lg">🔵</span>
                <span className="text-sm font-medium text-blue-700">Zoom</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                <span className="text-lg">🟢</span>
                <span className="text-sm font-medium text-green-700">Meet</span>
              </div>
            </div>

            <button
              onClick={() => {
                resetExternalForm();
                setShowExternalModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <CalendarPlus className="w-5 h-5" />
              Zaplanuj spotkanie
            </button>
          </div>
        </div>

        {/* Scheduled Meetings Section */}
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Zaplanowane spotkania</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'upcoming'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Nadchodzące ({upcomingMeetings.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'past'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Zakończone ({pastMeetings.length})
              </button>
            </div>
          </div>

          {isLoadingMeetings ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : displayedMeetings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'upcoming' ? 'Brak nadchodzących spotkań' : 'Brak zakończonych spotkań'}
              </h4>
              <p className="text-gray-500 text-sm">
                {activeTab === 'upcoming'
                  ? 'Zaplanuj nowe spotkanie klikając powyżej'
                  : 'Historia spotkań pojawi się tutaj'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {displayedMeetings.map((meeting) => {
                const platform = platformConfig[meeting.platform];
                return (
                  <div key={meeting.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${platform.bgColor} rounded-lg flex items-center justify-center text-xl`}>
                        {platform.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{meeting.title}</h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${platform.bgColor} ${platform.color}`}>
                                {platform.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatMeetingDateTime(meeting.scheduled_date, meeting.scheduled_time)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {meeting.duration_minutes} min
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {meeting.meeting_link && (
                              <>
                                <button
                                  onClick={() => handleCopyLink(meeting.meeting_link!)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Kopiuj link"
                                >
                                  {copiedLink === meeting.meeting_link ? (
                                    <Check className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                                <a
                                  href={meeting.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Otwórz link"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </>
                            )}
                            {meeting.platform === 'internal' && activeTab === 'upcoming' && (
                              <button
                                onClick={() => navigate(`/meeting/${meeting.id}`)}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-sm rounded-lg font-medium"
                              >
                                Dołącz
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteMeeting(meeting.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Usuń spotkanie"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {meeting.description && (
                          <p className="text-sm text-gray-500 mt-2">{meeting.description}</p>
                        )}

                        {meeting.participants.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div className="flex -space-x-2">
                              {meeting.participants.slice(0, 5).map((p, i) => (
                                <div
                                  key={p.id}
                                  className="w-7 h-7 bg-gray-200 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-gray-600"
                                  title={p.name}
                                >
                                  {p.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                              ))}
                              {meeting.participants.length > 5 && (
                                <div className="w-7 h-7 bg-gray-100 border-2 border-white rounded-full flex items-center justify-center text-xs font-medium text-gray-500">
                                  +{meeting.participants.length - 5}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {meeting.participants.length} uczestnik{meeting.participants.length === 1 ? '' : meeting.participants.length < 5 ? 'ów' : 'ów'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Internal Meeting Modal */}
      {showInternalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Nowe spotkanie wewnętrzne</h2>
                  <p className="text-sm text-gray-500">Rozpocznij natychmiastowe połączenie wideo</p>
                </div>
              </div>
              <button onClick={() => setShowInternalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tytuł spotkania *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="np. Daily Standup, Planowanie Sprintu"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Opis (opcjonalnie)</label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  rows={2}
                  placeholder="Dodaj opis spotkania..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Uczestnicy ({selectedUsers.length} wybrano) *
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Szukaj użytkowników..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Nie znaleziono użytkowników</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-500"
                        />
                        <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.first_name[0]}
                            {user.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowInternalModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateInternalMeeting}
                disabled={isCreating || !meetingTitle.trim() || selectedUsers.length === 0}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tworzenie...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Rozpocznij spotkanie
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External Meeting Modal */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CalendarPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Zaplanuj spotkanie zewnętrzne</h2>
                  <p className="text-sm text-gray-500">Wybierz platformę i zaplanuj spotkanie</p>
                </div>
              </div>
              <button onClick={() => setShowExternalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platforma *</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['teams', 'zoom', 'google_meet'] as MeetingPlatform[]).map((platform) => {
                    const config = platformConfig[platform];
                    return (
                      <button
                        key={platform}
                        onClick={() => setExternalPlatform(platform)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                          externalPlatform === platform
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl">{config.icon}</span>
                        <span className={`text-sm font-medium ${externalPlatform === platform ? 'text-blue-700' : 'text-gray-700'}`}>
                          {config.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tytuł spotkania *</label>
                <input
                  type="text"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                  placeholder="np. Spotkanie projektowe"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Opis (opcjonalnie)</label>
                <textarea
                  value={externalDescription}
                  onChange={(e) => setExternalDescription(e.target.value)}
                  rows={2}
                  placeholder="Dodaj opis spotkania..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
                  <input
                    type="date"
                    value={externalDate}
                    onChange={(e) => setExternalDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Godzina *</label>
                  <input
                    type="time"
                    value={externalTime}
                    onChange={(e) => setExternalTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Czas trwania</label>
                <select
                  value={externalDuration}
                  onChange={(e) => setExternalDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={15}>15 minut</option>
                  <option value={30}>30 minut</option>
                  <option value={45}>45 minut</option>
                  <option value={60}>1 godzina</option>
                  <option value={90}>1.5 godziny</option>
                  <option value={120}>2 godziny</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link do spotkania (opcjonalnie)
                  </div>
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={(e) => setExternalLink(e.target.value)}
                  placeholder={`np. https://${externalPlatform === 'teams' ? 'teams.microsoft.com/l/meetup-join/...' : externalPlatform === 'zoom' ? 'zoom.us/j/...' : 'meet.google.com/...'}`}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Możesz dodać link później lub udostępnić go uczestnikom osobno
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Powiadom uczestników ({externalParticipants.length} wybrano)
                </label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={externalSearchQuery}
                    onChange={(e) => setExternalSearchQuery(e.target.value)}
                    placeholder="Szukaj użytkowników..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {filteredExternalUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Nie znaleziono użytkowników</div>
                  ) : (
                    filteredExternalUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={externalParticipants.includes(user.id)}
                          onChange={() => toggleExternalParticipant(user.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {user.first_name[0]}
                            {user.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowExternalModal(false)}
                className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleScheduleExternalMeeting}
                disabled={isSaving || !externalTitle.trim() || !externalDate || !externalTime}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4" />
                    Zaplanuj spotkanie
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Meetings;
