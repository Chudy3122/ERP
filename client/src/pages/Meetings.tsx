import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Video, Plus, Users, X, Check } from 'lucide-react';
import * as meetingApi from '../api/meeting.api';
import * as adminApi from '../api/admin.api';
import IncomingCallModal from '../components/meeting/IncomingCallModal';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
}

const Meetings = () => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Mock incoming call - w prawdziwej aplikacji to będzie z WebSocket
  const [incomingCall, setIncomingCall] = useState<{
    callerName: string;
    meetingTitle: string;
    meetingId: string;
  } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await adminApi.getAllUsers(1, 1000);
      setUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateMeeting = async () => {
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

      // Po utworzeniu spotkania, przejdź do pokoju video
      navigate(`/meeting/${meeting.room_id}`, {
        state: { meetingId: meeting.id }
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Nie udało się utworzyć spotkania');
    } finally {
      setIsCreating(false);
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

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name} ${user.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Spotkania wideo</h1>
          <p className="text-gray-600">
            Twórz spotkania i zapraszaj członków zespołu
          </p>
        </div>

        {/* Create Meeting Button */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-all hover:shadow-lg"
          >
            <Plus className="w-6 h-6" />
            Nowe spotkanie
          </button>
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              HD wideo i audio
            </h3>
            <p className="text-sm text-gray-600">
              Wysokiej jakości połączenia wideo i audio dla wszystkich uczestników
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Zapraszaj uczestników
            </h3>
            <p className="text-sm text-gray-600">
              Wybierz członków zespołu którzy otrzymają zaproszenie do spotkania
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <Check className="w-6 h-6 text-gray-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Powiadomienia
            </h3>
            <p className="text-sm text-gray-600">
              Otrzymuj powiadomienia o przychodzących połączeniach wideo
            </p>
          </div>
        </div>
      </div>

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Nowe spotkanie</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Meeting Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tytuł spotkania *
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="np. Daily Standup, Planowanie Sprintu"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opis (opcjonalnie)
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  rows={3}
                  placeholder="Dodaj opis spotkania..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
              </div>

              {/* Participants Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Uczestnicy ({selectedUsers.length} wybrano) *
                </label>

                {/* Search */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Szukaj użytkowników..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 mb-3"
                />

                {/* User List */}
                <div className="border border-gray-200 rounded-md max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Nie znaleziono użytkowników
                    </div>
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
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {user.first_name[0]}{user.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
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
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-md font-medium"
              >
                Anuluj
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={isCreating || !meetingTitle.trim() || selectedUsers.length === 0}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-md font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>Tworzenie...</>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Rozpocznij spotkanie
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
