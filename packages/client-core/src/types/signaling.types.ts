export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface SessionDescriptionPayload {
  type: RTCSdpType;
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface RoomJoinedPayload {
  roomId: string;
  participantCount: number;
}

export interface RoomFullPayload {
  roomId: string;
  message: string;
}

export interface PeerEventPayload {
  roomId: string;
  participantCount?: number;
}

export interface OfferPayload {
  roomId: string;
  offer: SessionDescriptionPayload;
}

export interface AnswerPayload {
  roomId: string;
  answer: SessionDescriptionPayload;
}

export interface IceCandidateEventPayload {
  roomId: string;
  candidate: IceCandidatePayload;
}

export interface SignalingEvents {
  'room-joined': (payload: RoomJoinedPayload) => void;
  'room-full': (payload: RoomFullPayload) => void;
  'room-left': (payload: { roomId: string }) => void;
  'peer-joined': (payload: PeerEventPayload) => void;
  'peer-left': (payload: PeerEventPayload) => void;
  offer: (payload: OfferPayload) => void;
  answer: (payload: AnswerPayload) => void;
  'ice-candidate': (payload: IceCandidateEventPayload) => void;
}

export interface SignalingClientEvents {
  'join-room': (payload: { roomId: string }) => void;
  'leave-room': (payload: { roomId: string }) => void;
  offer: (payload: OfferPayload) => void;
  answer: (payload: AnswerPayload) => void;
  'ice-candidate': (payload: IceCandidateEventPayload) => void;
}
