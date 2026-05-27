import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { getFileUrl } from '../../api/axios-config';
import * as meetingApi from '../../api/meeting.api';
import socketService from '../../services/socket.service';
import { useChatContext } from '../../contexts/ChatContext';
import { playCallRingtone, stopCallRingtone } from '../../utils/audio';

interface CallData {
  meeting_id: string;
  room_id: string;
  meeting_title: string;
  caller: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const AUTO_DISMISS_SEC = 30;

const IncomingCallOverlay = () => {
  const navigate = useNavigate();
  const { isConnected } = useChatContext();
  const [call, setCall] = useState<CallData | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dismiss = () => {
    setCall(null);
    setSecondsLeft(AUTO_DISMISS_SEC);
    if (timerRef.current) clearInterval(timerRef.current);
    stopCallRingtone();
  };

  const handleAccept = () => {
    if (!call) return;
    const roomId = `meeting-${call.meeting_id}`;
    navigate(`/meeting/${roomId}`);
    dismiss();
  };

  const handleReject = () => {
    if (!call) return;
    meetingApi.rejectMeeting(call.meeting_id).catch(() => {});
    dismiss();
  };

  useEffect(() => {
    if (!isConnected) return;
    const socket = socketService.getSocket();
    if (!socket) return;

    const handler = (data: CallData) => {
      setCall(data);
      setSecondsLeft(AUTO_DISMISS_SEC);
      playCallRingtone();

      // Countdown
      if (timerRef.current) clearInterval(timerRef.current);
      let remaining = AUTO_DISMISS_SEC;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          dismiss();
        }
      }, 1000);
    };

    socket.on('meeting:invitation', handler);
    return () => {
      socket.off('meeting:invitation', handler);
      if (timerRef.current) clearInterval(timerRef.current);
      stopCallRingtone();
    };
  }, [isConnected]);

  if (!call) return null;

  const callerName = `${call.caller.first_name} ${call.caller.last_name}`;
  const initials = `${call.caller.first_name[0]}${call.caller.last_name[0]}`.toUpperCase();
  const progress = (secondsLeft / AUTO_DISMISS_SEC) * 100;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] w-80 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 animate-slide-up">
      {/* countdown bar */}
      <div
        className="h-1 bg-green-500 transition-all duration-1000"
        style={{ width: `${progress}%` }}
      />

      {/* Dark header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <Video className="w-4 h-4 text-gray-300" />
        <span className="text-sm font-semibold text-white">Przychodzące połączenie</span>
        <span className="ml-auto text-xs text-gray-400">{secondsLeft}s</span>
      </div>

      {/* Caller info */}
      <div className="bg-gray-800 px-4 py-4 flex items-center gap-4">
        {/* Avatar with pulsing ring */}
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-40" />
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white text-lg font-bold relative">
            {call.caller.avatar_url ? (
              <img
                src={getFileUrl(call.caller.avatar_url) || ''}
                alt={callerName}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : initials}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate">{callerName}</p>
          <p className="text-gray-400 text-xs truncate mt-0.5">{call.meeting_title}</p>
          <p className="text-green-400 text-xs mt-1 animate-pulse">dzwoni...</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="bg-gray-900 px-4 py-3 flex gap-3">
        <button
          onClick={handleReject}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-semibold transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          Odrzuć
        </button>
        <button
          onClick={handleAccept}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 active:scale-95 text-white text-sm font-semibold transition-all"
        >
          <Phone className="w-4 h-4" />
          Odbierz
        </button>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(120%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default IncomingCallOverlay;
