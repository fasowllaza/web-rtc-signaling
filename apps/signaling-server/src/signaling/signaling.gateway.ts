import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SignalingService } from './signaling.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { OfferDto } from './dto/offer.dto';
import { AnswerDto } from './dto/answer.dto';
import { IceCandidateDto } from './dto/ice-candidate.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SignalingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly signalingService: SignalingService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    const cleanup = this.signalingService.cleanupSocket(client.id);
    if (cleanup?.peerId) {
      this.server.to(cleanup.peerId).emit('peer-left', {
        roomId: cleanup.roomId,
      });
    }
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ): void {
    const result = this.signalingService.joinRoom(payload.roomId, client.id);

    if (!result.success) {
      client.emit('room-full', {
        roomId: payload.roomId,
        message: result.error ?? 'Room is full',
      });
      return;
    }

    void client.join(payload.roomId);

    client.emit('room-joined', {
      roomId: payload.roomId,
      participantCount: result.participantCount,
    });

    const peerId = this.signalingService.getOtherParticipant(
      payload.roomId,
      client.id,
    );

    if (peerId) {
      this.server.to(peerId).emit('peer-joined', {
        roomId: payload.roomId,
        participantCount: result.participantCount,
      });
    }
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveRoomDto,
  ): void {
    void client.leave(payload.roomId);

    const peerId = this.signalingService.leaveRoom(payload.roomId, client.id);

    client.emit('room-left', { roomId: payload.roomId });

    if (peerId) {
      this.server.to(peerId).emit('peer-left', { roomId: payload.roomId });
    }
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: OfferDto,
  ): void {
    if (!this.signalingService.isParticipant(payload.roomId, client.id)) {
      return;
    }

    const peerId = this.signalingService.getOtherParticipant(
      payload.roomId,
      client.id,
    );

    if (peerId) {
      // Relay SDP offer to the other peer — server never processes media/SDP content
      this.server.to(peerId).emit('offer', {
        roomId: payload.roomId,
        offer: payload.offer,
      });
    }
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerDto,
  ): void {
    if (!this.signalingService.isParticipant(payload.roomId, client.id)) {
      return;
    }

    const peerId = this.signalingService.getOtherParticipant(
      payload.roomId,
      client.id,
    );

    if (peerId) {
      // Relay SDP answer back to the caller
      this.server.to(peerId).emit('answer', {
        roomId: payload.roomId,
        answer: payload.answer,
      });
    }
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: IceCandidateDto,
  ): void {
    if (!this.signalingService.isParticipant(payload.roomId, client.id)) {
      return;
    }

    const peerId = this.signalingService.getOtherParticipant(
      payload.roomId,
      client.id,
    );

    if (peerId) {
      // Relay ICE candidate — enables P2P connection after signaling exchange
      this.server.to(peerId).emit('ice-candidate', {
        roomId: payload.roomId,
        candidate: payload.candidate,
      });
    }
  }
}
