import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebRTC } from '../hooks/useWebRTC';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Users,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Eye,
} from 'lucide-react';

type JoinMode = 'selecting' | 'participant' | 'observer';

const VideoMeeting: React.FC = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [joinMode, setJoinMode] = useState<JoinMode>('selecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);

  const meetingTitle = (location.state as any)?.meetingTitle || 'Spotkanie';

  // Only initialize WebRTC after user selects join mode
  const shouldConnect = joinMode !== 'selecting';

  const {
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isObserver,
    participants,
    connectionStatus,
    error,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
  } = useWebRTC({
    roomId: shouldConnect ? (roomName || '') : '',
    userId: user?.id || '',
    userName: user ? `${user.first_name} ${user.last_name}` : 'Gość',
    observerMode: joinMode === 'observer',
  });

  // Handle leave meeting
  const handleLeaveMeeting = () => {
    leaveRoom();
    navigate('/meeting');
  };

  // Handle copy meeting link
  const handleCopyLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!roomName) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">!</div>
          <h1 className="text-2xl font-bold text-white mb-2">Błąd</h1>
          <p className="text-gray-400 mb-6">Brak nazwy pokoju</p>
          <button
            onClick={() => navigate('/meeting')}
            className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Wróć do spotkań
          </button>
        </div>
      </div>
    );
  }

  // Pre-join screen - select how to join
  if (joinMode === 'selecting') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-lg w-full mx-4">
          <h1 className="text-2xl font-bold text-white mb-2">{meetingTitle}</h1>
          <p className="text-gray-400 mb-8">Wybierz sposób dołączenia do spotkania</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Join with camera/mic */}
            <button
              onClick={() => setJoinMode('participant')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 transition-all hover:border-blue-500 group"
            >
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Video className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Dołącz z kamerą</h3>
              <p className="text-gray-400 text-sm">
                Włącz kamerę i mikrofon aby uczestniczyć w spotkaniu
              </p>
            </button>

            {/* Join as observer */}
            <button
              onClick={() => setJoinMode('observer')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-6 transition-all hover:border-green-500 group"
            >
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Dołącz jako obserwator</h3>
              <p className="text-gray-400 text-sm">
                Oglądaj spotkanie bez kamery i mikrofonu
              </p>
            </button>
          </div>

          <button
            onClick={() => navigate('/meeting')}
            className="mt-8 px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Wróć do spotkań
          </button>
        </div>
      </div>
    );
  }

  // Error screen (only for participant mode, observers can still watch)
  if (error && !isObserver) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <VideoOff className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Nie można połączyć</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <p className="text-gray-500 text-sm mb-6">
            Upewnij się, że przeglądarka ma dostęp do kamery i mikrofonu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setJoinMode('observer')}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Dołącz jako obserwator
            </button>
            <button
              onClick={() => navigate('/meeting')}
              className="px-6 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Wróć do spotkań
            </button>
          </div>
        </div>
      </div>
    );
  }

  const allStreams = [
    ...(isObserver ? [] : [{ id: 'local', name: user ? `${user.first_name} ${user.last_name} (Ty)` : 'Ty', stream: localStream, isLocal: true }]),
    ...Array.from(remoteStreams.entries()).map(([id, { stream, name }]) => ({
      id,
      name,
      stream,
      isLocal: false,
    })),
  ];

  const mainStream = selectedStream
    ? allStreams.find(s => s.id === selectedStream) || allStreams[0]
    : allStreams.length > 0 ? allStreams[0] : null;

  const thumbnailStreams = mainStream ? allStreams.filter(s => s.id !== mainStream.id) : [];

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
            <h1 className="text-white font-semibold">{meetingTitle}</h1>
            {isObserver && (
              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full ml-2">
                Obserwator
              </span>
            )}
          </div>
          <span className="text-gray-500 text-sm hidden sm:block">|</span>
          <span className="text-gray-400 text-sm hidden sm:block">{roomName?.slice(0, 20)}...</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            title="Kopiuj link do spotkania"
          >
            {copiedLink ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Skopiowano!' : 'Kopiuj link'}</span>
          </button>

          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${showParticipants ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">{participants.length + (isObserver ? 0 : 1)}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? 'Wyjdź z pełnego ekranu' : 'Pełny ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 flex flex-col">
          {/* Main video */}
          <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-800 mb-4">
            {mainStream?.stream ? (
              <VideoPlayer
                stream={mainStream.stream}
                muted={mainStream.isLocal}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {allStreams.length === 0 ? (
                  <div className="text-center">
                    <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Oczekiwanie na uczestników...</p>
                    {isObserver && (
                      <p className="text-gray-500 text-sm mt-2">Jesteś w trybie obserwatora</p>
                    )}
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {mainStream ? getInitials(mainStream.name) : '?'}
                    </span>
                  </div>
                )}
              </div>
            )}
            {mainStream?.isLocal && !isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
                  <span className="text-4xl font-bold text-gray-400">
                    {mainStream ? getInitials(mainStream.name) : '?'}
                  </span>
                </div>
              </div>
            )}
            {mainStream && (
              <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white text-sm">
                {mainStream.name}
              </div>
            )}
          </div>

          {/* Thumbnail videos */}
          {thumbnailStreams.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {thumbnailStreams.map((streamData) => (
                <div
                  key={streamData.id}
                  className="relative flex-shrink-0 w-40 h-28 rounded-lg overflow-hidden bg-gray-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => setSelectedStream(streamData.id)}
                >
                  {streamData.stream && (streamData.isLocal ? isVideoEnabled : true) ? (
                    <VideoPlayer
                      stream={streamData.stream}
                      muted={streamData.isLocal}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-400">
                          {getInitials(streamData.name)}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-1 left-1 right-1 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-xs truncate">
                    {streamData.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participants sidebar */}
        {showParticipants && (
          <div className="w-72 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
            <h3 className="text-white font-semibold mb-4">
              Uczestnicy ({participants.length + (isObserver ? 0 : 1)})
            </h3>
            <div className="space-y-2">
              {/* Current user (only if not observer) */}
              {!isObserver && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/50">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user ? getInitials(`${user.first_name} ${user.last_name}`) : '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {user ? `${user.first_name} ${user.last_name}` : 'Ty'}
                    </p>
                    <p className="text-gray-400 text-xs">Ty</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!isAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                    {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
              )}

              {/* Observer indicator */}
              {isObserver && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 border border-gray-600">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5 text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {user ? `${user.first_name} ${user.last_name}` : 'Ty'}
                    </p>
                    <p className="text-gray-400 text-xs">Obserwator</p>
                  </div>
                </div>
              )}

              {/* Other participants */}
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {getInitials(participant.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{participant.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-t border-gray-700/50 px-6 py-4">
        <div className="flex items-center justify-center gap-3">
          {/* Audio toggle - disabled for observers */}
          {!isObserver && (
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all ${
                isAudioEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isAudioEnabled ? 'Wycisz mikrofon' : 'Włącz mikrofon'}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          )}

          {/* Video toggle - disabled for observers */}
          {!isObserver && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
              title={isVideoEnabled ? 'Wyłącz kamerę' : 'Włącz kamerę'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {/* Screen share toggle - disabled for observers */}
          {!isObserver && (
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`p-4 rounded-full transition-all ${
                isScreenSharing
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isScreenSharing ? 'Zatrzymaj udostępnianie ekranu' : 'Udostępnij ekran'}
            >
              {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>
          )}

          {/* Observer mode indicator */}
          {isObserver && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 rounded-full text-gray-300">
              <Eye className="w-5 h-5" />
              <span className="text-sm">Tryb obserwatora</span>
            </div>
          )}

          {/* Leave meeting */}
          <button
            onClick={handleLeaveMeeting}
            className={`p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all ${isObserver ? '' : 'ml-4'}`}
            title="Opuść spotkanie"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Video player component
interface VideoPlayerProps {
  stream: MediaStream;
  muted?: boolean;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, muted = false, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
};

export default VideoMeeting;
