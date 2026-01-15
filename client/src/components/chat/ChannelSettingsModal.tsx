import React, { useState, useEffect } from 'react';
import type { Channel } from '../../types/chat.types';
import type { User } from '../../types/auth.types';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel | null;
  currentUserId: string;
  onAddMembers: (channelId: string, userIds: string[]) => Promise<void>;
  onRemoveMember: (channelId: string, userId: string) => Promise<void>;
  onDeleteChannel: (channelId: string) => Promise<void>;
  availableUsers: User[];
}

const ChannelSettingsModal: React.FC<ChannelSettingsModalProps> = ({
  isOpen,
  onClose,
  channel,
  currentUserId,
  onAddMembers,
  onRemoveMember,
  onDeleteChannel,
  availableUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('members');
      setSelectedUsers([]);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !channel) return null;

  const isAdmin = channel.members?.find(m => m.user_id === currentUserId)?.role === 'admin';
  const currentMembers = channel.members || [];
  const memberIds = currentMembers.map(m => m.user_id);
  const nonMembers = availableUsers.filter(u => !memberIds.includes(u.id));

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      await onAddMembers(channel.id, selectedUsers);
      setSelectedUsers([]);
    } catch (err: any) {
      setError(err.message || 'Nie udało się dodać członków');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Czy na pewno chcesz usunąć tego użytkownika z kanału?')) return;

    try {
      setLoading(true);
      setError(null);
      await onRemoveMember(channel.id, userId);
    } catch (err: any) {
      setError(err.message || 'Nie udało się usunąć członka');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChannel = async () => {
    try {
      setLoading(true);
      setError(null);
      await onDeleteChannel(channel.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Nie udało się usunąć kanału');
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-6 border-b border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{channel.name || 'Kanał'}</h2>
              <p className="text-sm text-blue-100 mt-1">Zarządzaj ustawieniami kanału</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'members'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Członkowie ({currentMembers.length})
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  activeTab === 'settings'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ustawienia
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Add Members Section */}
              {isAdmin && nonMembers.length > 0 && (
                <div className="bg-blue-50 rounded-md p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Dodaj członków</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {nonMembers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          disabled={loading}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                            {user.first_name[0]}{user.last_name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleAddMembers}
                    disabled={loading || selectedUsers.length === 0}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Dodawanie...' : `Dodaj (${selectedUsers.length})`}
                  </button>
                </div>
              )}

              {/* Current Members */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Obecni członkowie</h3>
                <div className="space-y-2">
                  {currentMembers.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
                          {member.user?.first_name[0]}{member.user?.last_name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {member.user?.first_name} {member.user?.last_name}
                            {member.user_id === currentUserId && (
                              <span className="ml-2 text-xs text-indigo-600">(Ty)</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{member.user?.email}</div>
                        </div>
                        {member.role === 'admin' && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && member.user_id !== currentUserId && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && isAdmin && (
            <div className="space-y-6">
              {/* Channel Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Informacje o kanale</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Typ:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">{channel.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Utworzono:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {new Date(channel.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                  {channel.description && (
                    <div>
                      <span className="text-gray-600">Opis:</span>
                      <p className="mt-1 text-gray-900">{channel.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              {channel.type !== 'direct' && (
                <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                  <h3 className="text-sm font-semibold text-red-900 mb-2">Strefa niebezpieczna</h3>
                  <p className="text-sm text-red-700 mb-3">
                    Usunięcie kanału jest nieodwracalne. Wszystkie wiadomości zostaną utracone.
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Usuń kanał
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-red-900">
                        Czy na pewno chcesz usunąć ten kanał?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteChannel}
                          disabled={loading}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Usuwanie...' : 'Tak, usuń'}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={loading}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          Anuluj
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChannelSettingsModal;
