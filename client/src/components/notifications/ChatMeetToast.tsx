import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Video, X } from 'lucide-react';

export interface ChatMeetNotificationPayload {
  type: 'chat_message' | 'meeting_invitation' | 'meeting_scheduled';
  senderId?: string;
  senderName: string;
  senderAvatar?: string | null;
  channelId?: string;
  channelType?: string;
  channelName?: string;
  preview?: string;
  meetingId?: string;  // UUID — used for reject API
  roomId?: string;     // room_id — used for WebRTC navigation
  meetingTitle?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  platform?: string;
}

interface ToastItem extends ChatMeetNotificationPayload {
  id: string;
  expiresAt: number;
}

const TOAST_DURATION = 6000;

const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/gadu_gadu.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const ToastCard = ({
  toast,
  onClose,
  onOpen,
}: {
  toast: ToastItem;
  onClose: () => void;
  onOpen: () => void;
}) => {
  const [progress, setProgress] = useState(100);
  const startRef = useRef(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const isMeeting = toast.type === 'meeting_invitation' || toast.type === 'meeting_scheduled';

  const title =
    toast.type === 'meeting_invitation'
      ? `${toast.senderName} zaprasza na spotkanie`
      : toast.type === 'meeting_scheduled'
      ? `Nowe spotkanie: ${toast.meetingTitle}`
      : toast.channelType === 'direct'
      ? toast.senderName
      : toast.channelName || toast.senderName;

  const body =
    toast.type === 'meeting_invitation'
      ? toast.meetingTitle || 'Spotkanie w aplikacji'
      : toast.type === 'meeting_scheduled'
      ? `${toast.scheduledDate} o ${toast.scheduledTime}`
      : toast.preview || '';

  return (
    <div className="pointer-events-auto relative flex flex-col w-96 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 h-0.5 bg-[#F7941D] transition-none"
        style={{ width: `${progress}%` }}
      />

      <div className="flex items-start gap-3 p-4 pt-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {toast.senderAvatar ? (
            <img
              src={toast.senderAvatar}
              alt={toast.senderName}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold ${
                isMeeting ? 'bg-purple-600' : 'bg-[#F7941D]'
              }`}
            >
              {isMeeting ? (
                <Video className="w-5 h-5" />
              ) : (
                getInitials(toast.senderName)
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {isMeeting ? (
              <Video className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 text-[#F7941D] flex-shrink-0" />
            )}
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </p>
          </div>
          {body && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-snug">{body}</p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action row */}
      <div className="flex border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onOpen}
          className="flex-1 py-2.5 text-sm font-semibold text-[#F7941D] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          Otwórz
        </button>
        <div className="w-px bg-gray-100 dark:bg-gray-700" />
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Odrzuć
        </button>
      </div>
    </div>
  );
};

const ChatMeetToast = () => {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<ChatMeetNotificationPayload>).detail;
      const id = `${Date.now()}-${Math.random()}`;
      const item: ToastItem = { ...payload, id, expiresAt: Date.now() + TOAST_DURATION };
      setToasts((prev) => [...prev.slice(-3), item]); // max 4 stacked
      playNotificationSound();

      // Auto-dismiss
      setTimeout(() => removeToast(id), TOAST_DURATION);
    };

    window.addEventListener('chatmeet:notification', handler);
    return () => window.removeEventListener('chatmeet:notification', handler);
  }, []);

  const handleOpen = (toast: ToastItem) => {
    removeToast(toast.id);
    if (toast.type === 'chat_message' && toast.channelId) {
      navigate(`/meeting?channel=${toast.channelId}`);
    } else if (toast.type === 'meeting_invitation') {
      // Use roomId (room_id) for WebRTC navigation; fallback to meetingId
      const target = toast.roomId || toast.meetingId;
      if (target) navigate(`/meeting/${target}`);
    } else if (toast.type === 'meeting_scheduled') {
      navigate('/meeting');
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          onOpen={() => handleOpen(toast)}
        />
      ))}
    </div>
  );
};

export default ChatMeetToast;
