import { io, Socket } from 'socket.io-client';
import {
  AnswerPayload,
  IceCandidateEventPayload,
  OfferPayload,
  PeerEventPayload,
  RoomFullPayload,
  RoomJoinedPayload,
  SignalingClientEvents,
  SignalingEvents,
} from '../types/signaling.types';

type EventHandler<T> = (payload: T) => void;

export class SignalingClient {
  private socket: Socket<SignalingEvents, SignalingClientEvents> | null = null;

  connect(url: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(url, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('join-room', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('leave-room', { roomId });
  }

  sendOffer(payload: OfferPayload): void {
    this.socket?.emit('offer', payload);
  }

  sendAnswer(payload: AnswerPayload): void {
    this.socket?.emit('answer', payload);
  }

  sendIceCandidate(payload: IceCandidateEventPayload): void {
    this.socket?.emit('ice-candidate', payload);
  }

  onRoomJoined(handler: EventHandler<RoomJoinedPayload>): void {
    this.socket?.on('room-joined', handler);
  }

  onRoomFull(handler: EventHandler<RoomFullPayload>): void {
    this.socket?.on('room-full', handler);
  }

  onPeerJoined(handler: EventHandler<PeerEventPayload>): void {
    this.socket?.on('peer-joined', handler);
  }

  onPeerLeft(handler: EventHandler<PeerEventPayload>): void {
    this.socket?.on('peer-left', handler);
  }

  onOffer(handler: EventHandler<OfferPayload>): void {
    this.socket?.on('offer', handler);
  }

  onAnswer(handler: EventHandler<AnswerPayload>): void {
    this.socket?.on('answer', handler);
  }

  onIceCandidate(handler: EventHandler<IceCandidateEventPayload>): void {
    this.socket?.on('ice-candidate', handler);
  }

  offAllListeners(): void {
    this.socket?.off('room-joined');
    this.socket?.off('room-full');
    this.socket?.off('peer-joined');
    this.socket?.off('peer-left');
    this.socket?.off('offer');
    this.socket?.off('answer');
    this.socket?.off('ice-candidate');
  }
}

export const signalingClient = new SignalingClient();
