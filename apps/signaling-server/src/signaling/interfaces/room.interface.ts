export interface Participant {
  socketId: string;
  joinedAt: Date;
}

export interface RoomState {
  roomId: string;
  participants: Map<string, Participant>;
}

export interface JoinRoomResult {
  success: boolean;
  participantCount: number;
  error?: string;
}
