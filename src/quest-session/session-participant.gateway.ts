import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { ParticipantStatus } from '@/common/enums/ParticipantStatus';
import { AbstractSessionGateway } from './abstract-session.gateway';
import { AuthenticatedSocket, ErrorResponse } from './gateway.types';

interface ParticipantJoinedEvent {
    participantId: number;
    userId: number;
    userName: string;
    sessionId: number;
    joinedAt: Date;
}

interface ParticipantLeftEvent {
    participantId: number;
    userId: number;
    userName: string;
    sessionId: number;
    leftAt: Date;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/participants',
})
export class SessionParticipantGateway extends AbstractSessionGateway {
    @WebSocketServer()
    server: Server;

    protected gatewayName = 'participants';

    constructor(
        protected jwtService: JwtService,
        @InjectRepository(QuestSessionEntity)
        protected sessionRepository: Repository<QuestSessionEntity>,
    ) {
        super();
    }


    @SubscribeMessage('subscribe-to-session')
    async handleSubscribeToSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        try {
            const { sessionId } = data;

            if (!client.userId) {
                return this.emitError(client, 'subscribe-error', 'User is not authenticated',
                    `[participants:subscribe] Client ${client.id} has no userId`);
            }

            if (!sessionId) {
                return this.emitError(client, 'subscribe-error', 'Session ID is required');
            }

            if (typeof sessionId !== 'number' || sessionId <= 0) {
                return this.emitError(client, 'subscribe-error', 'Invalid session ID');
            }

            const session = await this.getSessionWithRelations(sessionId);

            if (!session) {
                return this.emitError(client, 'subscribe-error', 'Session not found',
                    `[participants:subscribe] Session ${sessionId} not found`);
            }

            const isOrganizer = this.isOrganizer(session, client.userId);
            const participant = this.getParticipant(session, client.userId);
            const isParticipant = !!participant;

            if (!isOrganizer && !isParticipant) {
                return this.emitError(client, 'subscribe-error', 'You do not have access to this session',
                    `[participants:subscribe] User ${client.userId} has no access to session ${sessionId}`);
            }

            if (!isOrganizer && participant && participant.participationStatus === ParticipantStatus.REJECTED) {
                return this.emitError(client, 'subscribe-error', 'You have been rejected from this session',
                    `[participants:subscribe] User ${client.userId} has been rejected from session ${sessionId}`);
            }

            client.join(`session-${sessionId}`);

            return {
                success: true,
                message: 'Subscribed to session participant updates',
                sessionId,
            };
        } catch (error) {
            console.error(`[participants:subscribe] Error:`, error);
            const errorResponse: ErrorResponse = { success: false, error: error.message || 'Unknown error occurred' };
            client.emit('subscribe-error', errorResponse);
            return errorResponse;
        }
    }

    @SubscribeMessage('unsubscribe-from-session')
    async handleUnsubscribeFromSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        try {
            const { sessionId } = data;

            if (!client.userId) {
                return this.emitError(client, 'unsubscribe-error', 'User is not authenticated',
                    `[participants:unsubscribe] Client ${client.id} has no userId`);
            }

            if (!sessionId) {
                return this.emitError(client, 'unsubscribe-error', 'Session ID is required');
            }

            if (typeof sessionId !== 'number' || sessionId <= 0) {
                return this.emitError(client, 'unsubscribe-error', 'Invalid session ID');
            }

            client.leave(`session-${sessionId}`);

            return {
                success: true,
                message: 'Unsubscribed from session participant updates',
                sessionId,
            };
        } catch (error) {
            console.error(`[participants:unsubscribe] Error:`, error);
            const errorResponse: ErrorResponse = { success: false, error: error.message || 'Unknown error occurred' };
            client.emit('unsubscribe-error', errorResponse);
            return errorResponse;
        }
    }

    async notifyParticipantJoined(participant: ParticipantEntity): Promise<void> {
        try {
            if (!participant) {
                return;
            }

            if (!participant.session) {
                return;
            }

            if (!participant.user) {
                return;
            }

            const sessionId = participant.session.questSessionId;

            if (!sessionId || sessionId <= 0) {
                return;
            }

            const event: ParticipantJoinedEvent = {
                participantId: participant.participantId,
                userId: participant.user.userId,
                userName: participant.user.name,
                sessionId,
                joinedAt: participant.createdAt,
            };

            this.server.to(`session-${sessionId}`).emit('participant-joined', event);
        } catch (error) {
            console.error('[participants:notify] Error broadcasting participant-joined:', error.message);
        }
    }

    async notifyParticipantLeft(sessionId: number, participant: ParticipantEntity): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            if (!participant) {
                return;
            }

            if (!participant.user) {
                return;
            }

            const event: ParticipantLeftEvent = {
                participantId: participant.participantId,
                userId: participant.user.userId,
                userName: participant.user.name,
                sessionId,
                leftAt: new Date(),
            };

            this.server.to(`session-${sessionId}`).emit('participant-left', event);
        } catch (error) {
            console.error('[participants:notify] Error broadcasting participant-left:', error.message);
        }
    }
}
