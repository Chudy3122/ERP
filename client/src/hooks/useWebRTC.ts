import { useState, useEffect, useRef, useCallback } from 'react';
import socketService from '../services/socket.service';

interface PeerConnection {
  peerId: string;
  peerName: string;
  connection: RTCPeerConnection;
  stream: MediaStream | null;
}

interface UseWebRTCOptions {
  roomId: string;
  userId: string;
  userName: string;
  observerMode?: boolean; // Join without camera/microphone
  onParticipantJoined?: (peerId: string, peerName: string) => void;
  onParticipantLeft?: (peerId: string) => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: Map<string, { stream: MediaStream; name: string }>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isObserver: boolean;
  participants: { id: string; name: string }[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  error: string | null;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  leaveRoom: () => void;
}

// ICE servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export const useWebRTC = ({
  roomId,
  userId,
  userName,
  observerMode = false,
  onParticipantJoined,
  onParticipantLeft,
}: UseWebRTCOptions): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; name: string }>>(new Map());
  const [isAudioEnabled, setIsAudioEnabled] = useState(!observerMode);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!observerMode);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isObserver] = useState(observerMode);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    // Skip media access in observer mode
    if (observerMode) {
      console.log('Observer mode - skipping media access');
      return null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error('Error accessing media devices:', err);
      setError('Nie udało się uzyskać dostępu do kamery/mikrofonu');
      setConnectionStatus('error');
      throw err;
    }
  }, [observerMode]);

  // Create peer connection for a specific peer
  const createPeerConnection = useCallback((peerId: string, peerName: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to the connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc:ice-candidate', {
          roomId,
          targetUserId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerName}:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Try to reconnect
        console.log('Connection failed/disconnected, may need to reconnect');
      }
    };

    // Handle incoming tracks (remote stream)
    pc.ontrack = (event) => {
      console.log('Received remote track from', peerName);
      const [remoteStream] = event.streams;
      setRemoteStreams((prev) => {
        const newMap = new Map(prev);
        newMap.set(peerId, { stream: remoteStream, name: peerName });
        return newMap;
      });
    };

    // Store the peer connection
    peerConnections.current.set(peerId, {
      peerId,
      peerName,
      connection: pc,
      stream: null,
    });

    return pc;
  }, [roomId]);

  // Handle incoming offer
  const handleOffer = useCallback(async (data: { fromUserId: string; fromUserName: string; offer: RTCSessionDescriptionInit }) => {
    const { fromUserId, fromUserName, offer } = data;
    console.log('Received offer from', fromUserName);

    let pc = peerConnections.current.get(fromUserId)?.connection;
    if (!pc) {
      pc = createPeerConnection(fromUserId, fromUserName);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socketService.emit('webrtc:answer', {
      roomId,
      targetUserId: fromUserId,
      answer,
    });

    setParticipants((prev) => {
      if (!prev.find((p) => p.id === fromUserId)) {
        return [...prev, { id: fromUserId, name: fromUserName }];
      }
      return prev;
    });
    onParticipantJoined?.(fromUserId, fromUserName);
  }, [roomId, createPeerConnection, onParticipantJoined]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (data: { fromUserId: string; answer: RTCSessionDescriptionInit }) => {
    const { fromUserId, answer } = data;
    console.log('Received answer from', fromUserId);

    const peerConnection = peerConnections.current.get(fromUserId);
    if (peerConnection) {
      await peerConnection.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
    const { fromUserId, candidate } = data;
    const peerConnection = peerConnections.current.get(fromUserId);
    if (peerConnection) {
      try {
        await peerConnection.connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    }
  }, []);

  // Handle user joined room
  const handleUserJoined = useCallback(async (data: { userId: string; userName: string }) => {
    const { userId: peerId, userName: peerName } = data;
    console.log('User joined:', peerName);

    // Create offer for the new user
    const pc = createPeerConnection(peerId, peerName);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketService.emit('webrtc:offer', {
      roomId,
      targetUserId: peerId,
      offer,
    });

    setParticipants((prev) => {
      if (!prev.find((p) => p.id === peerId)) {
        return [...prev, { id: peerId, name: peerName }];
      }
      return prev;
    });
    onParticipantJoined?.(peerId, peerName);
  }, [roomId, createPeerConnection, onParticipantJoined]);

  // Handle user left room
  const handleUserLeft = useCallback((data: { userId: string }) => {
    const { userId: peerId } = data;
    console.log('User left:', peerId);

    // Close and remove peer connection
    const peerConnection = peerConnections.current.get(peerId);
    if (peerConnection) {
      peerConnection.connection.close();
      peerConnections.current.delete(peerId);
    }

    // Remove remote stream
    setRemoteStreams((prev) => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });

    setParticipants((prev) => prev.filter((p) => p.id !== peerId));
    onParticipantLeft?.(peerId);
  }, [onParticipantLeft]);

  // Initialize WebRTC
  useEffect(() => {
    // Don't connect if roomId is empty
    if (!roomId) {
      return;
    }

    const init = async () => {
      try {
        // Initialize local stream (will be null in observer mode)
        await initializeLocalStream();

        // Setup socket listeners
        const socket = socketService.getSocket();
        if (socket) {
          socket.on('webrtc:user-joined', handleUserJoined);
          socket.on('webrtc:user-left', handleUserLeft);
          socket.on('webrtc:offer', handleOffer);
          socket.on('webrtc:answer', handleAnswer);
          socket.on('webrtc:ice-candidate', handleIceCandidate);

          // Join the room
          socket.emit('webrtc:join-room', { roomId, userId, userName });
          setConnectionStatus('connected');
        }
      } catch (err) {
        // In observer mode, we still want to connect even without media
        if (observerMode) {
          const socket = socketService.getSocket();
          if (socket) {
            socket.on('webrtc:user-joined', handleUserJoined);
            socket.on('webrtc:user-left', handleUserLeft);
            socket.on('webrtc:offer', handleOffer);
            socket.on('webrtc:answer', handleAnswer);
            socket.on('webrtc:ice-candidate', handleIceCandidate);
            socket.emit('webrtc:join-room', { roomId, userId, userName });
            setConnectionStatus('connected');
          }
        } else {
          console.error('Failed to initialize WebRTC:', err);
        }
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      if (!roomId) return;

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('webrtc:leave-room', { roomId, userId });
        socket.off('webrtc:user-joined');
        socket.off('webrtc:user-left');
        socket.off('webrtc:offer');
        socket.off('webrtc:answer');
        socket.off('webrtc:ice-candidate');
      }

      // Close all peer connections
      peerConnections.current.forEach((pc) => {
        pc.connection.close();
      });
      peerConnections.current.clear();

      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, userId, userName, observerMode, initializeLocalStream, handleUserJoined, handleUserLeft, handleOffer, handleAnswer, handleIceCandidate]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace video track in all peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.connection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });

      // Update local stream
      if (localStreamRef.current) {
        const localVideoTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(localVideoTrack);
        localStreamRef.current.addTrack(screenTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
      }

      setIsScreenSharing(true);

      // Handle when user stops sharing from browser UI
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.error('Error starting screen share:', err);
      setError('Nie udało się udostępnić ekranu');
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!screenStreamRef.current) return;

    // Get camera video track again
    try {
      const newCameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      });

      const cameraTrack = newCameraStream.getVideoTracks()[0];

      // Replace screen track with camera track in all peer connections
      peerConnections.current.forEach((pc) => {
        const sender = pc.connection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      });

      // Update local stream
      if (localStreamRef.current) {
        const screenTrack = localStreamRef.current.getVideoTracks()[0];
        localStreamRef.current.removeTrack(screenTrack);
        localStreamRef.current.addTrack(cameraTrack);
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]));
      }

      // Stop screen stream tracks
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('webrtc:leave-room', { roomId, userId });
    }

    // Close all peer connections
    peerConnections.current.forEach((pc) => {
      pc.connection.close();
    });
    peerConnections.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Stop screen stream
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setRemoteStreams(new Map());
    setParticipants([]);
    setConnectionStatus('disconnected');
  }, [roomId, userId]);

  return {
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
  };
};

export default useWebRTC;
