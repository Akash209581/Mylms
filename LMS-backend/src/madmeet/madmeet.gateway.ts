import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { trustedOrigins, isOriginTrusted } from '../common/request-origin';

interface ParticipantInfo {
  socketId: string;
  name: string;
  roomCode: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => callback(null, !origin || isOriginTrusted(origin, trustedOrigins())),
    credentials: true,
  },
  namespace: '/madmeet',
})
export class MadmeetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MadmeetGateway.name);

  // Map<socketId, ParticipantInfo>
  private participants = new Map<string, ParticipantInfo>();

  // Map<roomCode, Set<socketId>>
  private rooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`[Madmeet] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[Madmeet] Client disconnected: ${client.id}`);
    this.handleLeaveRoom(client);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; name: string },
  ) {
    const roomCode = (data.roomCode || 'DEFAULT').trim().toUpperCase();
    const name = (data.name || 'Guest User').trim();

    // Leave any previous room
    this.handleLeaveRoom(client);

    const participant: ParticipantInfo = {
      socketId: client.id,
      name,
      roomCode,
      audioEnabled: true,
      videoEnabled: true,
    };

    this.participants.set(client.id, participant);

    if (!this.rooms.has(roomCode)) {
      this.rooms.set(roomCode, new Set());
    }
    const roomMembers = this.rooms.get(roomCode)!;

    // Build array of existing participants in the room
    const existingParticipants = Array.from(roomMembers)
      .map((sid) => this.participants.get(sid))
      .filter((p): p is ParticipantInfo => !!p);

    roomMembers.add(client.id);
    client.join(roomCode);

    this.logger.log(`[Madmeet] ${name} (${client.id}) joined room "${roomCode}". Total members: ${roomMembers.size}`);

    // Send existing room members to the joining client
    client.emit('room-joined', {
      yourSocketId: client.id,
      roomCode,
      existingParticipants,
    });

    // Notify all existing members in the room about the new participant
    client.to(roomCode).emit('user-joined', {
      participant,
    });
  }

  @SubscribeMessage('signal-offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; offer: any },
  ) {
    const sender = this.participants.get(client.id);
    this.server.to(data.targetSocketId).emit('signal-offer', {
      senderSocketId: client.id,
      senderName: sender?.name || 'Peer',
      offer: data.offer,
    });
  }

  @SubscribeMessage('signal-answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; answer: any },
  ) {
    this.server.to(data.targetSocketId).emit('signal-answer', {
      senderSocketId: client.id,
      answer: data.answer,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetSocketId: string; candidate: any },
  ) {
    this.server.to(data.targetSocketId).emit('ice-candidate', {
      senderSocketId: client.id,
      candidate: data.candidate,
    });
  }

  @SubscribeMessage('toggle-media')
  handleToggleMedia(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { mediaType: 'audio' | 'video'; enabled: boolean },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    if (data.mediaType === 'audio') participant.audioEnabled = data.enabled;
    if (data.mediaType === 'video') participant.videoEnabled = data.enabled;

    this.server.to(participant.roomCode).emit('media-toggled', {
      socketId: client.id,
      mediaType: data.mediaType,
      enabled: data.enabled,
    });
  }

  @SubscribeMessage('send-chat')
  handleSendChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ) {
    const participant = this.participants.get(client.id);
    if (!participant || !data.message?.trim()) return;

    const chatPayload = {
      id: `${Date.now()}-${Math.random()}`,
      senderSocketId: client.id,
      senderName: participant.name,
      message: data.message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    this.server.to(participant.roomCode).emit('chat-message', chatPayload);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const participant = this.participants.get(client.id);
    if (!participant) return;

    const { roomCode } = participant;
    this.participants.delete(client.id);

    const roomMembers = this.rooms.get(roomCode);
    if (roomMembers) {
      roomMembers.delete(client.id);
      if (roomMembers.size === 0) {
        this.rooms.delete(roomCode);
      }
    }

    client.leave(roomCode);
    this.server.to(roomCode).emit('user-left', {
      socketId: client.id,
      name: participant.name,
    });

    this.logger.log(`[Madmeet] Participant ${participant.name} (${client.id}) left room "${roomCode}"`);
  }
}
