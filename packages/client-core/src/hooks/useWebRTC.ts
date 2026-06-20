import { useCallback, useEffect, useRef, useState } from 'react';
import { signalingClient } from '../services/signaling.service';
import { ConnectionStatus, OfferPayload } from '../types/signaling.types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

interface UseWebRTCOptions {
  signalingServerUrl: string;
}

interface UseWebRTCReturn {
  roomId: string;
  setRoomId: (roomId: string) => void;
  connectionStatus: ConnectionStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isJoined: boolean;
  errorMessage: string | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  startCall: () => Promise<void>;
}

export function useWebRTC({
  signalingServerUrl,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [roomId, setRoomId] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const isNegotiatingRef = useRef(false);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const cleanupPeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    isNegotiatingRef.current = false;
    pendingIceCandidatesRef.current = [];
  }, []);

  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  const flushPendingIceCandidates = useCallback(async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection?.remoteDescription) {
      return;
    }

    const pending = [...pendingIceCandidatesRef.current];
    pendingIceCandidatesRef.current = [];

    for (const candidate of pending) {
      await peerConnection.addIceCandidate(candidate);
    }
  }, []);

  const addIceCandidate = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const peerConnection = peerConnectionRef.current;
      if (!peerConnection) {
        return;
      }

      if (!peerConnection.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }

      await peerConnection.addIceCandidate(candidate);
    },
    [],
  );

  const createPeerConnection = useCallback(
    (currentRoomId: string): RTCPeerConnection => {
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          signalingClient.sendIceCandidate({
            roomId: currentRoomId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      peerConnection.ontrack = (event) => {
        const stream =
          event.streams[0] ??
          (() => {
            const trackStream = new MediaStream();
            trackStream.addTrack(event.track);
            return trackStream;
          })();

        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };

      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;

        if (state === 'connected') {
          setConnectionStatus('connected');
        } else if (state === 'connecting') {
          setConnectionStatus('connecting');
        } else if (
          state === 'disconnected' ||
          state === 'failed' ||
          state === 'closed'
        ) {
          setConnectionStatus('disconnected');
        }
      };

      return peerConnection;
    },
    [],
  );

  const ensureLocalMedia = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const handleIncomingOffer = useCallback(
    async (payload: OfferPayload) => {
      const currentRoomId = activeRoomIdRef.current;
      if (!currentRoomId || payload.roomId !== currentRoomId) {
        return;
      }

      if (
        peerConnectionRef.current?.signalingState === 'have-local-offer'
      ) {
        cleanupPeerConnection();
        isNegotiatingRef.current = false;
      }

      if (isNegotiatingRef.current && peerConnectionRef.current) {
        return;
      }

      try {
        setConnectionStatus('connecting');
        isNegotiatingRef.current = true;

        const stream = await ensureLocalMedia();
        const peerConnection = createPeerConnection(currentRoomId);
        peerConnectionRef.current = peerConnection;

        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream);
        });

        await peerConnection.setRemoteDescription(payload.offer);
        await flushPendingIceCandidates();

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        signalingClient.sendAnswer({
          roomId: currentRoomId,
          answer,
        });
      } catch (error) {
        isNegotiatingRef.current = false;
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to handle offer',
        );
        setConnectionStatus('disconnected');
      }
    },
    [createPeerConnection, ensureLocalMedia, flushPendingIceCandidates],
  );

  const handleIncomingAnswer = useCallback(
    async (payload: { roomId: string; answer: RTCSessionDescriptionInit }) => {
      const currentRoomId = activeRoomIdRef.current;
      const peerConnection = peerConnectionRef.current;

      if (!currentRoomId || !peerConnection || payload.roomId !== currentRoomId) {
        return;
      }

      try {
        await peerConnection.setRemoteDescription(payload.answer);
        await flushPendingIceCandidates();
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to handle answer',
        );
        setConnectionStatus('disconnected');
      }
    },
    [flushPendingIceCandidates],
  );

  const handleIncomingIceCandidate = useCallback(
    async (payload: {
      roomId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const currentRoomId = activeRoomIdRef.current;

      if (!currentRoomId || payload.roomId !== currentRoomId) {
        return;
      }

      try {
        await addIceCandidate(payload.candidate);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to add ICE candidate',
        );
      }
    },
    [addIceCandidate],
  );

  const registerSignalingHandlers = useCallback(() => {
    signalingClient.offAllListeners();

    signalingClient.onRoomJoined((payload) => {
      activeRoomIdRef.current = payload.roomId;
      setIsJoined(true);
      setErrorMessage(null);
      setConnectionStatus('disconnected');
    });

    signalingClient.onRoomFull((payload) => {
      setErrorMessage(payload.message);
      setIsJoined(false);
      activeRoomIdRef.current = null;
    });

    signalingClient.onPeerJoined(() => {
      setErrorMessage(null);
    });

    signalingClient.onPeerLeft(() => {
      cleanupPeerConnection();
      cleanupMedia();
      setConnectionStatus('disconnected');
    });

    signalingClient.onOffer((payload) => {
      void handleIncomingOffer(payload);
    });

    signalingClient.onAnswer((payload) => {
      void handleIncomingAnswer(payload);
    });

    signalingClient.onIceCandidate((payload) => {
      void handleIncomingIceCandidate(payload);
    });
  }, [
    cleanupMedia,
    cleanupPeerConnection,
    handleIncomingAnswer,
    handleIncomingIceCandidate,
    handleIncomingOffer,
  ]);

  const joinRoom = useCallback(async () => {
    const trimmedRoomId = roomId.trim();
    if (!trimmedRoomId) {
      setErrorMessage('Room ID is required');
      return;
    }

    setErrorMessage(null);
    signalingClient.connect(signalingServerUrl);
    registerSignalingHandlers();

    signalingClient.joinRoom(trimmedRoomId);
  }, [registerSignalingHandlers, roomId, signalingServerUrl]);

  const startCall = useCallback(async () => {
    const currentRoomId = activeRoomIdRef.current;
    if (!currentRoomId || isNegotiatingRef.current) {
      return;
    }

    try {
      isNegotiatingRef.current = true;
      setConnectionStatus('connecting');
      setErrorMessage(null);

      const stream = await ensureLocalMedia();
      const peerConnection = createPeerConnection(currentRoomId);
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      signalingClient.sendOffer({
        roomId: currentRoomId,
        offer,
      });
    } catch (error) {
      isNegotiatingRef.current = false;
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to start call',
      );
      setConnectionStatus('disconnected');
    }
  }, [createPeerConnection, ensureLocalMedia]);

  const leaveRoom = useCallback(() => {
    const currentRoomId = activeRoomIdRef.current;

    if (currentRoomId) {
      signalingClient.leaveRoom(currentRoomId);
    }

    cleanupPeerConnection();
    cleanupMedia();
    signalingClient.offAllListeners();
    signalingClient.disconnect();

    activeRoomIdRef.current = null;
    setIsJoined(false);
    setConnectionStatus('disconnected');
  }, [cleanupMedia, cleanupPeerConnection]);

  useEffect(() => {
    return () => {
      cleanupPeerConnection();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
      signalingClient.offAllListeners();
      signalingClient.disconnect();
    };
  }, [cleanupPeerConnection]);

  return {
    roomId,
    setRoomId,
    connectionStatus,
    localStream,
    remoteStream,
    isJoined,
    errorMessage,
    joinRoom,
    leaveRoom,
    startCall,
  };
}
