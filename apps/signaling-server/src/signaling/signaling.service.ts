import { Injectable, Logger } from '@nestjs/common';
import {
  JoinRoomResult,
  RoomState,
} from './interfaces/room.interface';

const MAX_PARTICIPANTS_PER_ROOM = 2;

@Injectable()
export class SignalingService {
  private readonly logger = new Logger(SignalingService.name);
  private readonly rooms = new Map<string, RoomState>();
  private readonly socketRoomIndex = new Map<string, string>();

  joinRoom(roomId: string, socketId: string): JoinRoomResult {
    let room = this.rooms.get(roomId);

    if (!room) {
      room = {
        roomId,
        participants: new Map(),
      };
      this.rooms.set(roomId, room);
    }

    if (room.participants.size >= MAX_PARTICIPANTS_PER_ROOM) {
      return {
        success: false,
        participantCount: room.participants.size,
        error: 'Room is full',
      };
    }

    if (room.participants.has(socketId)) {
      return {
        success: true,
        participantCount: room.participants.size,
      };
    }

    room.participants.set(socketId, {
      socketId,
      joinedAt: new Date(),
    });
    this.socketRoomIndex.set(socketId, roomId);

    this.logger.log(
      `Socket ${socketId} joined room ${roomId} (${room.participants.size}/${MAX_PARTICIPANTS_PER_ROOM})`,
    );

    return {
      success: true,
      participantCount: room.participants.size,
    };
  }

  leaveRoom(roomId: string, socketId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    room.participants.delete(socketId);
    this.socketRoomIndex.delete(socketId);

    const peerId = this.getOtherParticipant(roomId, socketId);

    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      this.logger.log(`Room ${roomId} deleted (empty)`);
    } else {
      this.logger.log(
        `Socket ${socketId} left room ${roomId} (${room.participants.size} remaining)`,
      );
    }

    return peerId;
  }

  getOtherParticipant(roomId: string, socketId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    for (const participantId of room.participants.keys()) {
      if (participantId !== socketId) {
        return participantId;
      }
    }

    return null;
  }

  cleanupSocket(socketId: string): { roomId: string; peerId: string | null } | null {
    const roomId = this.socketRoomIndex.get(socketId);
    if (!roomId) {
      return null;
    }

    const peerId = this.leaveRoom(roomId, socketId);
    return { roomId, peerId };
  }

  isParticipant(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    return room?.participants.has(socketId) ?? false;
  }
}
