import { useEffect, useRef } from 'react';
import { useWebRTC } from '../hooks/useWebRTC';
import { ConnectionStatus } from '../types/signaling.types';
import './VideoCall.css';

interface VideoCallProps {
  signalingServerUrl?: string;
  defaultRoomId?: string;
  title?: string;
}

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
};

export function VideoCall({
  signalingServerUrl = import.meta.env.VITE_SIGNALING_SERVER_URL ??
    'http://localhost:8080',
  defaultRoomId = '',
  title = 'WebRTC Video Call',
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
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
  } = useWebRTC({ signalingServerUrl });

  useEffect(() => {
    if (defaultRoomId) {
      setRoomId(defaultRoomId);
    }
  }, [defaultRoomId, setRoomId]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-call">
      <header className="video-call__header">
        <h1>{title}</h1>
        <span className={`video-call__status video-call__status--${connectionStatus}`}>
          {STATUS_LABELS[connectionStatus]}
        </span>
      </header>

      <section className="video-call__controls">
        <input
          type="text"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
          placeholder="Room ID"
          disabled={isJoined}
        />
        <button type="button" onClick={() => void joinRoom()} disabled={isJoined}>
          Join Room
        </button>
        <button
          type="button"
          onClick={() => void startCall()}
          disabled={
            !isJoined ||
            connectionStatus === 'connected' ||
            connectionStatus === 'connecting'
          }
        >
          Start Call
        </button>
        <button type="button" onClick={leaveRoom} disabled={!isJoined}>
          Leave Room
        </button>
      </section>

      {errorMessage ? (
        <p className="video-call__error">{errorMessage}</p>
      ) : null}

      <section className="video-call__videos">
        <div className="video-call__panel">
          <h2>Local Video</h2>
          <video ref={localVideoRef} autoPlay playsInline muted />
        </div>
        <div className="video-call__panel">
          <h2>Remote Video</h2>
          <video ref={remoteVideoRef} autoPlay playsInline />
        </div>
      </section>
    </div>
  );
}
