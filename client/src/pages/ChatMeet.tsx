import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import Message from '../components/chat/Message';
import MessageInput from '../components/chat/MessageInput';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { useChatContext } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../api/axios-config';
import * as meetingApi from '../api/meeting.api';
import * as adminApi from '../api/admin.api';
import type { Channel } from '../types/chat.types';
import type { AdminUser } from '../types/admin.types';
import {
  MessageSquare,
  CalendarDays,
  Plus,
  Search,
  Video,
  Globe,
  Users,
  Clock,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  CalendarPlus,
  MonitorPlay,
  Link2,
  Trash2,
  MoreHorizontal,
  LogOut,
  PhoneCall,
  ChevronRight,
} from 'lucide-react';

type SidebarTab = 'chat' | 'meetings';
type MeetingPlatform = 'internal' | 'teams' | 'zoom' | 'google_meet';
type MeetingsTab = 'upcoming' | 'past';

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

const platformConfig: Record<MeetingPlatform, { name: string; color: string; bgColor: string; icon: string; darkBg: string }> = {
  internal: { name: 'System ERP', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '🖥️', darkBg: 'dark:bg-gray-700' },
  teams: { name: 'Microsoft Teams', color: 'text-indigo-700', bgColor: 'bg-indigo-100', icon: '🟣', darkBg: 'dark:bg-indigo-900/40' },
  zoom: { name: 'Zoom', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🔵', darkBg: 'dark:bg-blue-900/40' },
  google_meet: { name: 'Google Meet', color: 'text-green-700', bgColor: 'bg-green-100', icon: '🟢', darkBg: 'dark:bg-green-900/40' },
};

const ChatMeet: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Chat context
  const {
    channels,
    activeChannel,
    messages,
    typingUsers,
    loadChannels,
    setActiveChannel,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTypingIndicator,
    getUserStatus,
    unreadMessages,
    removeChannelMember,
    deleteChannelById,
  } = useChatContext();

  // Sidebar state
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const [chatSearch, setChatSearch] = useState('');

  // Chat channel context menu
  const [contextMenu, setContextMenu] = useState<{ channelId: string; x: number; y: number } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'leave' | 'delete'; channel: Channel } | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Set<string>>(new Set());

  // New conversation
  const [showNewConv, setShowNewConv] = useState(false);
  const [convSearch, setConvSearch] = useState('');
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Meetings state
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsTab, setMeetingsTab] = useState<MeetingsTab>('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState<ScheduledMeeting | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [deleteMeetingId, setDeleteMeetingId] = useState<string | null>(null);

  // Internal meeting modal
  const [showInternalModal, setShowInternalModal] = useState(false);
  const [intTitle, setIntTitle] = useState('');
  const [intDesc, setIntDesc] = useState('');
  const [intParticipants, setIntParticipants] = useState<string[]>([]);
  const [intSearch, setIntSearch] = useState('');
  const [intDate, setIntDate] = useState('');
  const [intTime, setIntTime] = useState('');
  const [intDuration, setIntDuration] = useState(60);
  const [isCreating, setIsCreating] = useState(false);

  // External meeting modal
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [extPlatform, setExtPlatform] = useState<MeetingPlatform>('teams');
  const [extTitle, setExtTitle] = useState('');
  const [extDesc, setExtDesc] = useState('');
  const [extLink, setExtLink] = useState('');
  const [extDate, setExtDate] = useState('');
  const [extTime, setExtTime] = useState('');
  const [extDuration, setExtDuration] = useState(60);
  const [extParticipants, setExtParticipants] = useState<string[]>([]);
  const [extSearch, setExtSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Members panel
  const [showMembers, setShowMembers] = useState(false);

  // Messages scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load channels and meetings on mount + scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    loadChannels();
    loadScheduledMeetings();
  }, [loadChannels]);

  // Auto-open channel from ?channel= query param
  useEffect(() => {
    const channelId = searchParams.get('channel');
    if (!channelId || channels.length === 0) return;
    const target = channels.find((ch) => ch.id === channelId);
    if (target) {
      setSidebarTab('chat');
      setActiveChannel(target);
    }
  }, [searchParams, channels]);

  // Note: meeting:invitation is handled globally by IncomingCallOverlay in MainLayout

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Load all users for new conversation / meeting creation
  const loadUsers = async () => {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const res = await adminApi.getAllUsers(1, 1000);
      setAllUsers(res.users);
    } catch {
      // silently fail
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadScheduledMeetings = async () => {
    setLoadingMeetings(true);
    try {
      const data = await meetingApi.getScheduledMeetings();
      setScheduledMeetings(data);
    } catch {
      setScheduledMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  };

  // --- Chat helpers ---
  const getOtherMember = (channel: Channel) => {
    if (!channel.members) return undefined;
    return channel.members.find((m) => m.user_id !== user?.id) ?? channel.members[0];
  };

  const getChannelName = (channel: Channel): string => {
    if (channel.type === 'direct') {
      const other = getOtherMember(channel);
      if (other?.user) return `${other.user.first_name} ${other.user.last_name}`;
    }
    return channel.name ?? 'Bez nazwy';
  };

  const getStatusColor = (status?: string) =>
    status === 'online' ? 'bg-green-500' :
    status === 'away' ? 'bg-yellow-500' :
    status === 'busy' ? 'bg-red-500' :
    status === 'in_meeting' ? 'bg-purple-500' :
    'bg-gray-400 dark:bg-gray-500';

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffH = (now.getTime() - date.getTime()) / 3600000;
    if (diffH < 1) {
      const m = Math.floor(diffH * 60);
      return m === 0 ? 'teraz' : `${m} min temu`;
    }
    if (diffH < 24) return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'wczoraj';
    return date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  };

  const filteredChannels = channels.filter((ch) =>
    getChannelName(ch).toLowerCase().includes(chatSearch.toLowerCase())
  );

  const filteredAllUsers = allUsers.filter((u) =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(convSearch.toLowerCase())
  );

  const handleChannelClick = (channel: Channel) => {
    setSelectedMeeting(null);
    setActiveChannel(channel);
  };

  const handleContextMenu = (e: React.MouseEvent, channelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ channelId, x: e.clientX, y: e.clientY });
  };

  const handleConfirmChannelAction = async () => {
    if (!confirmDialog) return;
    setDialogLoading(true);
    try {
      if (confirmDialog.type === 'leave' && user) {
        await removeChannelMember(confirmDialog.channel.id, user.id);
        await loadChannels();
        if (activeChannel?.id === confirmDialog.channel.id) setActiveChannel(null);
      } else if (confirmDialog.type === 'delete') {
        await deleteChannelById(confirmDialog.channel.id);
      }
    } finally {
      setDialogLoading(false);
      setConfirmDialog(null);
    }
  };

  const handleStartDirectChat = async (userId: string) => {
    setShowNewConv(false);
    // find existing DM channel or create
    const existing = channels.find(
      (ch) => ch.type === 'direct' && ch.members?.some((m) => m.user_id === userId)
    );
    if (existing) {
      setActiveChannel(existing);
      setSelectedMeeting(null);
      return;
    }
    try {
      const ch = await import('../api/chat.api').then((m) => m.createDirectChannel({ userId }));
      await loadChannels();
      setActiveChannel(ch);
      setSelectedMeeting(null);
    } catch {
      // silently fail
    }
  };

  // --- Meeting helpers ---
  const now = new Date();
  const upcomingMeetings = scheduledMeetings.filter(
    (m) => new Date(`${m.scheduled_date}T${m.scheduled_time}`) >= now
  );
  const pastMeetings = scheduledMeetings.filter(
    (m) => new Date(`${m.scheduled_date}T${m.scheduled_time}`) < now
  );
  const displayedMeetings = meetingsTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const formatMeetingDateTime = (date: string, time: string) =>
    new Date(`${date}T${time}`).toLocaleDateString('pl-PL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleDeleteMeeting = async () => {
    if (!deleteMeetingId) return;
    try {
      await meetingApi.deleteScheduledMeeting(deleteMeetingId);
      if (selectedMeeting?.id === deleteMeetingId) setSelectedMeeting(null);
      await loadScheduledMeetings();
    } finally {
      setDeleteMeetingId(null);
    }
  };

  // Internal meeting — start now or schedule for later
  const handleCreateInternalMeeting = async () => {
    if (!intTitle.trim() || intParticipants.length === 0) return;
    setIsCreating(true);
    try {
      if (intDate && intTime) {
        // Schedule for a specific date/time
        await meetingApi.scheduleExternalMeeting({
          title: intTitle,
          description: intDesc,
          platform: 'internal',
          scheduled_date: intDate,
          scheduled_time: intTime,
          duration_minutes: intDuration,
          participant_ids: intParticipants,
        });
        setShowInternalModal(false);
        resetIntForm();
        await loadScheduledMeetings();
        setSidebarTab('meetings');
      } else {
        // Start immediately
        const meeting = await meetingApi.createMeeting({
          title: intTitle,
          description: intDesc,
          participant_ids: intParticipants,
        });
        navigate(`/meeting/${meeting.room_id}`, { state: { meetingId: meeting.id } });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się utworzyć spotkania');
    } finally {
      setIsCreating(false);
    }
  };

  // External meeting
  const handleScheduleExternalMeeting = async () => {
    if (!extTitle.trim() || !extDate || !extTime) return;
    setIsSaving(true);
    try {
      await meetingApi.scheduleExternalMeeting({
        title: extTitle,
        description: extDesc,
        platform: extPlatform,
        meeting_link: extLink,
        scheduled_date: extDate,
        scheduled_time: extTime,
        duration_minutes: extDuration,
        participant_ids: extParticipants,
      });
      setShowExternalModal(false);
      resetExtForm();
      await loadScheduledMeetings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nie udało się zaplanować spotkania');
    } finally {
      setIsSaving(false);
    }
  };

  const resetIntForm = () => { setIntTitle(''); setIntDesc(''); setIntParticipants([]); setIntSearch(''); setIntDate(''); setIntTime(''); setIntDuration(60); };
  const resetExtForm = () => { setExtTitle(''); setExtDesc(''); setExtLink(''); setExtDate(''); setExtTime(''); setExtDuration(60); setExtParticipants([]); setExtSearch(''); };

  // Active chat header info
  const activeOtherMember = activeChannel ? getOtherMember(activeChannel) : undefined;
  const activeOtherUser = activeOtherMember?.user ?? null;
  const activeUserStatus = activeOtherUser ? getUserStatus(activeOtherUser.id) : null;
  const [chatAvatarError, setChatAvatarError] = useState(false);
  useEffect(() => { setChatAvatarError(false); }, [activeChannel?.id]);

  return (
    <MainLayout title="Chat & Meet">
      <div className="flex h-[calc(100vh-64px)] -m-3 lg:-m-4 overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">

          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Chat & Meet</h1>
              <button
                onClick={() => {
                  if (sidebarTab === 'chat') {
                    loadUsers();
                    setShowNewConv(true);
                  } else {
                    loadUsers();
                    setShowExternalModal(true);
                    resetExtForm();
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                title={sidebarTab === 'chat' ? 'Nowa rozmowa' : 'Zaplanuj spotkanie'}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-0.5">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sidebarTab === 'chat'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Czaty
              </button>
              <button
                onClick={() => { setSidebarTab('meetings'); setActiveChannel(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sidebarTab === 'meetings'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Spotkania
              </button>
            </div>
          </div>

          {/* ── CHAT TAB ── */}
          {sidebarTab === 'chat' && (
            <>
              {/* Search */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Szukaj rozmowy..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Channel list */}
              <div className="flex-1 overflow-y-auto">
                {filteredChannels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chatSearch ? 'Brak wyników' : 'Brak rozmów'}
                    </p>
                    {!chatSearch && (
                      <button
                        onClick={() => { loadUsers(); setShowNewConv(true); }}
                        className="mt-3 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                      >
                        Nowa rozmowa
                      </button>
                    )}
                  </div>
                ) : (
                  filteredChannels.map((channel) => {
                    const isActive = activeChannel?.id === channel.id;
                    const other = channel.type === 'direct' ? getOtherMember(channel) : undefined;
                    const unread = unreadMessages.get(channel.id) || 0;
                    const statusObj = other?.user ? getUserStatus(other.user.id) : null;

                    return (
                      <div key={channel.id} className="relative group" onContextMenu={(e) => handleContextMenu(e, channel.id)}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleChannelClick(channel)}
                          onKeyDown={(e) => e.key === 'Enter' && handleChannelClick(channel)}
                          className={`w-full px-3 py-3 flex items-center gap-3 cursor-pointer transition-all ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-600'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                          }`}
                        >
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden ${
                              isActive ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-200'
                            }`}>
                              {channel.type === 'direct' && other?.user?.avatar_url && !avatarErrors.has(channel.id) ? (
                                <img src={getFileUrl(other.user.avatar_url) || ''} alt="" className="w-full h-full rounded-full object-cover" onError={() => setAvatarErrors((p) => new Set(p).add(channel.id))} />
                              ) : channel.type === 'direct' && other?.user ? (
                                `${other.user.first_name[0]}${other.user.last_name[0]}`
                              ) : (
                                <Users className="w-5 h-5" />
                              )}
                            </div>
                            {other?.user && (
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(statusObj?.status)}`} />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-medium text-sm truncate ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                {getChannelName(channel)}
                              </span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {channel.last_message_at && (
                                  <span className="text-xs text-gray-400">{formatTime(channel.last_message_at)}</span>
                                )}
                                {unread > 0 && (
                                  <span className="min-w-5 h-5 px-1.5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                                    {unread > 9 ? '9+' : unread}
                                  </span>
                                )}
                              </div>
                            </div>
                            {channel.type !== 'direct' && channel.members && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{channel.members.length} uczestników</p>
                            )}
                          </div>

                          {/* More */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleContextMenu(e, channel.id); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* ── MEETINGS TAB ── */}
          {sidebarTab === 'meetings' && (
            <>
              {/* Quick action buttons */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 space-y-2">
                <button
                  onClick={() => { loadUsers(); resetIntForm(); setShowInternalModal(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <MonitorPlay className="w-4 h-4 flex-shrink-0" />
                  Spotkanie w aplikacji
                </button>
                <button
                  onClick={() => { loadUsers(); resetExtForm(); setShowExternalModal(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 flex-shrink-0" />
                  Zaplanuj spotkanie zewnętrzne
                </button>
              </div>

              {/* Meetings list tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {(['upcoming', 'past'] as MeetingsTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMeetingsTab(tab)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      meetingsTab === tab
                        ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab === 'upcoming' ? `Nadchodzące (${upcomingMeetings.length})` : `Przeszłe (${pastMeetings.length})`}
                  </button>
                ))}
              </div>

              {/* Meeting list */}
              <div className="flex-1 overflow-y-auto">
                {loadingMeetings ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : displayedMeetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {meetingsTab === 'upcoming' ? 'Brak nadchodzących spotkań' : 'Brak historii spotkań'}
                    </p>
                  </div>
                ) : (
                  displayedMeetings.map((meeting) => {
                    const platform = platformConfig[meeting.platform];
                    const isSelected = selectedMeeting?.id === meeting.id;
                    return (
                      <div
                        key={meeting.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedMeeting(meeting); setActiveChannel(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedMeeting(meeting)}
                        className={`w-full px-3 py-3 flex items-start gap-3 cursor-pointer transition-all border-l-2 ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'
                        }`}
                      >
                        <div className={`w-9 h-9 ${platform.bgColor} ${platform.darkBg} rounded-lg flex items-center justify-center text-base flex-shrink-0`}>
                          {platform.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                            {meeting.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`).toLocaleDateString('pl-PL', {
                              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* ── MAIN AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">

          {/* Empty state */}
          {!activeChannel && !selectedMeeting && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center shadow-sm mb-6">
                <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Chat & Meet</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm">
                Wybierz rozmowę lub spotkanie z panelu po lewej, albo rozpocznij nowe
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                <button
                  onClick={() => { loadUsers(); setShowNewConv(true); setSidebarTab('chat'); }}
                  className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Nowa rozmowa</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Napisz do kogoś</p>
                  </div>
                </button>

                <button
                  onClick={() => { loadUsers(); resetIntForm(); setShowInternalModal(true); setSidebarTab('meetings'); }}
                  className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Video className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Spotkanie w aplikacji</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">WebRTC, bez wychodzenia</p>
                  </div>
                </button>

                <button
                  onClick={() => { loadUsers(); resetExtForm(); setShowExternalModal(true); setSidebarTab('meetings'); }}
                  className="flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">Zaplanuj spotkanie</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Teams, Zoom, Google Meet</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Active chat view */}
          {activeChannel && !selectedMeeting && (() => {
            const isGroup = activeChannel.type !== 'direct';
            const members = activeChannel.members ?? [];
            const onlineMembers = members.filter((m) => {
              const s = getUserStatus(m.user_id);
              return s && s.status !== 'offline';
            });

            return (
              <div className="flex flex-col h-full">
                {/* Chat header */}
                <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
                      {activeOtherUser?.avatar_url && !chatAvatarError ? (
                        <img src={getFileUrl(activeOtherUser.avatar_url) || ''} alt="" className="w-full h-full object-cover" onError={() => setChatAvatarError(true)} />
                      ) : activeOtherUser ? (
                        `${activeOtherUser.first_name[0]}${activeOtherUser.last_name[0]}`
                      ) : (
                        <Users className="w-5 h-5" />
                      )}
                    </div>
                    {activeOtherUser && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(activeUserStatus?.status)}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-white truncate">
                      {getChannelName(activeChannel)}
                    </h2>
                    {activeOtherUser ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activeUserStatus?.status === 'online' ? 'Online' :
                         activeUserStatus?.status === 'away' ? 'Zaraz wracam' :
                         activeUserStatus?.status === 'busy' ? 'Zajęty' :
                         activeUserStatus?.status === 'in_meeting' ? 'Na spotkaniu' : 'Offline'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {members.length} uczestników{onlineMembers.length > 0 ? `, ${onlineMembers.length} online` : ''}
                      </p>
                    )}
                  </div>

                  {/* Members toggle (group only) */}
                  {isGroup && (
                    <button
                      onClick={() => setShowMembers((v) => !v)}
                      title="Uczestnicy"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        showMembers
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span className="hidden sm:inline">{members.length}</span>
                    </button>
                  )}

                  <button
                    onClick={() => { loadUsers(); resetIntForm(); if (activeOtherUser) setIntParticipants([activeOtherUser.id]); setShowInternalModal(true); }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                    title="Rozpocznij spotkanie wideo"
                  >
                    <PhoneCall className="w-5 h-5" />
                  </button>
                </div>

                {/* Body: messages + optional members panel */}
                <div className="flex flex-1 min-h-0">

                  {/* Messages + input */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1 min-h-0">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Brak wiadomości</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Napisz pierwszą wiadomość</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {messages.map((message) => (
                            <Message key={message.id} message={message} onEdit={editMessage} onDelete={deleteMessage} />
                          ))}
                          {typingUsers.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 ml-2 mt-2">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                              </div>
                              <span>pisze...</span>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                      <MessageInput
                        onSendMessage={sendMessage}
                        onTyping={sendTypingIndicator}
                        placeholder={`Napisz do ${getChannelName(activeChannel)}...`}
                      />
                    </div>
                  </div>

                  {/* Members panel */}
                  {isGroup && showMembers && (
                    <div className="w-56 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
                      <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Uczestnicy — {members.length}
                        </span>
                        <button
                          onClick={() => setShowMembers(false)}
                          className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto py-2">
                        {members.map((member) => {
                          const u = member.user;
                          if (!u) return null;
                          const statusObj = getUserStatus(u.id);
                          const isMe = u.id === user?.id;
                          return (
                            <div key={member.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <div className="relative flex-shrink-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center text-xs font-semibold text-gray-700 dark:text-gray-200 overflow-hidden">
                                  {u.avatar_url ? (
                                    <img src={getFileUrl(u.avatar_url) || ''} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                  ) : (
                                    `${u.first_name[0]}${u.last_name[0]}`
                                  )}
                                </div>
                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(statusObj?.status)}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                  {u.first_name} {u.last_name}{isMe ? ' (Ty)' : ''}
                                </p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                  {member.role === 'admin' ? 'Admin' :
                                   statusObj?.status === 'online' ? 'Online' :
                                   statusObj?.status === 'away' ? 'Zaraz wracam' :
                                   statusObj?.status === 'busy' ? 'Zajęty' :
                                   statusObj?.status === 'in_meeting' ? 'Na spotkaniu' : 'Offline'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Meeting detail view */}
          {selectedMeeting && !activeChannel && (
            <div className="flex flex-col h-full">
              {/* Meeting header */}
              <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 ${platformConfig[selectedMeeting.platform].bgColor} ${platformConfig[selectedMeeting.platform].darkBg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                    {platformConfig[selectedMeeting.platform].icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedMeeting.title}</h2>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${platformConfig[selectedMeeting.platform].bgColor} ${platformConfig[selectedMeeting.platform].color} ${platformConfig[selectedMeeting.platform].darkBg}`}>
                      {platformConfig[selectedMeeting.platform].name}
                    </span>
                  </div>
                  <button
                    onClick={() => setDeleteMeetingId(selectedMeeting.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Meeting details */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl space-y-5">
                  {/* Date & time */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Termin</h3>
                    <div className="flex flex-wrap gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                          <p className="font-medium text-gray-900 dark:text-white text-sm capitalize">
                            {formatMeetingDateTime(selectedMeeting.scheduled_date, selectedMeeting.scheduled_time)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Clock className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Czas trwania</p>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {selectedMeeting.duration_minutes} minut
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {selectedMeeting.description && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Opis</h3>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{selectedMeeting.description}</p>
                    </div>
                  )}

                  {/* Meeting link */}
                  {selectedMeeting.meeting_link && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Link do spotkania</h3>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{selectedMeeting.meeting_link}</p>
                        </div>
                        <button
                          onClick={() => handleCopyLink(selectedMeeting.meeting_link!)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Kopiuj link"
                        >
                          {copiedLink === selectedMeeting.meeting_link ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                        <a
                          href={selectedMeeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Dołącz
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Join in-app meeting */}
                  {selectedMeeting.platform === 'internal' && (
                    <button
                      onClick={() => navigate(`/meeting/${selectedMeeting.id}`, { state: { meetingTitle: selectedMeeting.title } })}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
                    >
                      <Video className="w-5 h-5" />
                      Dołącz do spotkania w aplikacji
                    </button>
                  )}

                  {/* Participants */}
                  {selectedMeeting.participants.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Uczestnicy ({selectedMeeting.participants.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedMeeting.participants.map((p) => (
                          <div key={p.id} className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
                              {p.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <span className="text-sm text-gray-900 dark:text-white">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CHANNEL CONTEXT MENU ── */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-[100] min-w-[160px]"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 180) }}
        >
          {(() => {
            const channel = channels.find((c) => c.id === contextMenu.channelId);
            if (!channel) return null;
            const isCreator = channel.created_by === user?.id;
            return (
              <>
                {channel.type !== 'direct' && (
                  <button
                    onClick={() => { setConfirmDialog({ type: 'leave', channel }); setContextMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" /> Opuść
                  </button>
                )}
                {(isCreator || channel.type === 'direct') && (
                  <button
                    onClick={() => { setConfirmDialog({ type: 'delete', channel }); setContextMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" /> Usuń
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* ── NEW CONVERSATION MODAL ── */}
      {showNewConv && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nowa rozmowa</h2>
              <button onClick={() => setShowNewConv(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder="Szukaj użytkownika..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : filteredAllUsers.filter((u) => u.id !== user?.id).length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">Nie znaleziono</div>
                ) : (
                  filteredAllUsers.filter((u) => u.id !== user?.id).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleStartDirectChat(u.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="w-9 h-9 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        {u.first_name[0]}{u.last_name[0]}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INTERNAL MEETING MODAL ── */}
      {showInternalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Spotkanie w aplikacji</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Natychmiastowe połączenie wideo</p>
                </div>
              </div>
              <button onClick={() => setShowInternalModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tytuł spotkania *</label>
                <input
                  type="text"
                  value={intTitle}
                  onChange={(e) => setIntTitle(e.target.value)}
                  placeholder="np. Daily Standup"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Opis (opcjonalnie)</label>
                <textarea
                  value={intDesc}
                  onChange={(e) => setIntDesc(e.target.value)}
                  rows={2}
                  placeholder="Dodaj opis..."
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {/* Optional scheduling */}
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Zaplanuj na datę (opcjonalnie — brak daty = start natychmiast)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
                    <input
                      type="date"
                      value={intDate}
                      onChange={(e) => setIntDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Godzina</label>
                    <input
                      type="time"
                      value={intTime}
                      onChange={(e) => setIntTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Czas trwania</label>
                  <select
                    value={intDuration}
                    onChange={(e) => setIntDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                  >
                    {[15, 30, 45, 60, 90, 120].map((d) => (
                      <option key={d} value={d}>{d < 60 ? `${d} minut` : `${d / 60} godzin${d === 60 ? 'a' : 'y'}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Uczestnicy ({intParticipants.length} wybrano) *</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={intSearch}
                    onChange={(e) => setIntSearch(e.target.value)}
                    placeholder="Szukaj..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-44 overflow-y-auto">
                  {allUsers.filter((u) => u.id !== user?.id && `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(intSearch.toLowerCase())).map((u) => (
                    <label key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <input type="checkbox" checked={intParticipants.includes(u.id)} onChange={() => setIntParticipants((p) => p.includes(u.id) ? p.filter((id) => id !== u.id) : [...p, u.id])} className="w-4 h-4 text-gray-800 rounded" />
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">{u.first_name[0]}{u.last_name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button onClick={() => setShowInternalModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Anuluj</button>
              <button
                onClick={handleCreateInternalMeeting}
                disabled={isCreating || !intTitle.trim() || intParticipants.length === 0}
                className="px-4 py-2 text-sm bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : intDate && intTime ? <CalendarPlus className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                {isCreating ? 'Tworzenie...' : intDate && intTime ? 'Zaplanuj' : 'Rozpocznij teraz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EXTERNAL MEETING MODAL ── */}
      {showExternalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">Zaplanuj spotkanie</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Teams, Zoom lub Google Meet</p>
                </div>
              </div>
              <button onClick={() => setShowExternalModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Platform selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platforma *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['teams', 'zoom', 'google_meet'] as MeetingPlatform[]).map((pl) => (
                    <button
                      key={pl}
                      onClick={() => setExtPlatform(pl)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${extPlatform === pl ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
                    >
                      <span className="text-xl">{platformConfig[pl].icon}</span>
                      <span className={`text-xs font-medium ${extPlatform === pl ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>{platformConfig[pl].name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tytuł *</label>
                <input type="text" value={extTitle} onChange={(e) => setExtTitle(e.target.value)} placeholder="np. Spotkanie projektowe" className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Opis (opcjonalnie)</label>
                <textarea value={extDesc} onChange={(e) => setExtDesc(e.target.value)} rows={2} placeholder="Dodaj opis..." className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Data *</label>
                  <input type="date" value={extDate} onChange={(e) => setExtDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Godzina *</label>
                  <input type="time" value={extTime} onChange={(e) => setExtTime(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Czas trwania</label>
                <select value={extDuration} onChange={(e) => setExtDuration(Number(e.target.value))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  {[15, 30, 45, 60, 90, 120].map((d) => <option key={d} value={d}>{d < 60 ? `${d} minut` : `${d / 60} godzin${d === 60 ? 'a' : 'y'}`}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <div className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Link do spotkania (opcjonalnie)</div>
                </label>
                <input type="url" value={extLink} onChange={(e) => setExtLink(e.target.value)} placeholder={`https://${extPlatform === 'teams' ? 'teams.microsoft.com/...' : extPlatform === 'zoom' ? 'zoom.us/j/...' : 'meet.google.com/...'}`} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Uczestnicy ({extParticipants.length} wybrano)</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={extSearch} onChange={(e) => setExtSearch(e.target.value)} placeholder="Szukaj..." className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" />
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-36 overflow-y-auto">
                  {allUsers.filter((u) => u.id !== user?.id && `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(extSearch.toLowerCase())).map((u) => (
                    <label key={u.id} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <input type="checkbox" checked={extParticipants.includes(u.id)} onChange={() => setExtParticipants((p) => p.includes(u.id) ? p.filter((id) => id !== u.id) : [...p, u.id])} className="w-4 h-4 text-blue-600 rounded" />
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium">{u.first_name[0]}{u.last_name[0]}</div>
                      <p className="text-sm text-gray-900 dark:text-white truncate">{u.first_name} {u.last_name}</p>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <button onClick={() => setShowExternalModal(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Anuluj</button>
              <button
                onClick={handleScheduleExternalMeeting}
                disabled={isSaving || !extTitle.trim() || !extDate || !extTime}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                {isSaving ? 'Zapisywanie...' : 'Zaplanuj'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog !== null}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleConfirmChannelAction}
        title={confirmDialog?.type === 'leave' ? 'Opuść czat' : 'Usuń czat'}
        message={confirmDialog?.type === 'leave' ? 'Czy na pewno chcesz opuścić tę rozmowę?' : 'Czy na pewno chcesz usunąć tę rozmowę? Tej operacji nie można cofnąć.'}
        confirmText={confirmDialog?.type === 'leave' ? 'Opuść' : 'Usuń'}
        cancelText="Anuluj"
        variant={confirmDialog?.type === 'delete' ? 'danger' : 'warning'}
        icon={confirmDialog?.type === 'delete' ? 'delete' : 'leave'}
        loading={dialogLoading}
      />

      <ConfirmDialog
        isOpen={deleteMeetingId !== null}
        onClose={() => setDeleteMeetingId(null)}
        onConfirm={handleDeleteMeeting}
        title="Usuń spotkanie"
        message="Czy na pewno chcesz usunąć to spotkanie?"
        confirmText="Usuń"
        cancelText="Anuluj"
        variant="danger"
        icon="delete"
      />
    </MainLayout>
  );
};

export default ChatMeet;
