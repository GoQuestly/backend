import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LocationService } from './location.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { UpdateLocationDto } from "@/quest-session/dto/update-location.dto";
import { PRE_SESSION_GRACE_PERIOD_MS } from './quest-session.constants';

interface AuthenticatedSocket extends Socket {
    userId?: number;
    sessionId?: number;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/location',
})
export class LocationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private sessionParticipants: Map<number, Set<string>> = new Map();

    constructor(
        private locationService: LocationService,
        private jwtService: JwtService,
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
    ) {}

    async handleConnection(client: AuthenticatedSocket) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                console.error(`[connection] No token provided for client ${client.id}`);
                client.emit('error', {
                    success: false,
                    error: 'Authentication token is required',
                });
                setTimeout(() => client.disconnect(), 100);
                return;
            }

            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;

            console.log(`Client connected: ${client.id}, userId: ${client.userId}`);
        } catch (error) {
            console.error(`[connection] Authentication error for client ${client.id}:`, error.message);
            client.emit('error', {
                success: false,
                error: error.name === 'TokenExpiredError'
                    ? 'Authentication token has expired'
                    : 'Invalid authentication token',
            });
            setTimeout(() => client.disconnect(), 100);
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        console.log(`Client disconnected: ${client.id}`);

        if (client.sessionId) {
            const participants = this.sessionParticipants.get(client.sessionId);
            if (participants) {
                participants.delete(client.id);
                if (participants.size === 0) {
                    this.sessionParticipants.delete(client.sessionId);
                }
            }
        }
    }

    private isSessionActive(session: QuestSessionEntity): boolean {
        const now = new Date();

        if (session.endReason) {
            return false;
        }

        const gracePeriodStart = new Date(session.startDate.getTime() - PRE_SESSION_GRACE_PERIOD_MS);
        if (now < gracePeriodStart) {
            return false;
        }

        if (session.endDate) {
            return session.endDate > now;
        }

        const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
        const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

        return now < maxEndTime;
    }

    @SubscribeMessage('join-session')
    async handleJoinSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        try {
            const { sessionId } = data;

            console.log(`[join-session] User ${client.userId} attempting to join session ${sessionId}`);

            const session = await this.sessionRepository.findOne({
                where: { questSessionId: sessionId },
                relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
            });

            if (!session) {
                console.error(`[join-session] Session ${sessionId} not found`);
                const errorResponse = { success: false, error: 'Session not found' };
                client.emit('join-session-error', errorResponse);
                return errorResponse;
            }

            const isOrganizer = session.quest.organizer.userId === client.userId;
            const isParticipant = session.participants.some(p => p.user.userId === client.userId);

            if (!isOrganizer && !isParticipant) {
                console.error(`[join-session] User ${client.userId} has no access to session ${sessionId}`);
                const errorResponse = { success: false, error: 'You do not have access to this session' };
                client.emit('join-session-error', errorResponse);
                return errorResponse;
            }

            if (!this.isSessionActive(session)) {
                console.error(`[join-session] Session ${sessionId} is not active`);
                const errorResponse = { success: false, error: 'Session is not active' };
                client.emit('join-session-error', errorResponse);
                return errorResponse;
            }

            client.sessionId = sessionId;
            client.join(`session-${sessionId}`);

            if (!this.sessionParticipants.has(sessionId)) {
                this.sessionParticipants.set(sessionId, new Set());
            }
            this.sessionParticipants.get(sessionId).add(client.id);

            console.log(`[join-session] User ${client.userId} successfully joined session ${sessionId}`);

            return {
                success: true,
                message: 'Joined session',
            };
        } catch (error) {
            console.error(`[join-session] Error:`, error);
            const errorResponse = { success: false, error: error.message || 'Unknown error occurred' };
            client.emit('join-session-error', errorResponse);
            return errorResponse;
        }
    }

    @SubscribeMessage('leave-session')
    async handleLeaveSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        const { sessionId } = data;
        console.log(`[leave-session] User ${client.userId} leaving session ${sessionId}`);

        client.leave(`session-${sessionId}`);

        const participants = this.sessionParticipants.get(sessionId);
        if (participants) {
            participants.delete(client.id);
        }

        return { success: true, message: 'Left session', sessionId };
    }

    @SubscribeMessage('update-location')
    async handleLocationUpdate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number; latitude: number; longitude: number }
    ) {
        try {
            const { sessionId, latitude, longitude } = data;

            const locationDto: UpdateLocationDto = { latitude, longitude };

            const location = await this.locationService.updateLocation(
                sessionId,
                client.userId,
                locationDto
            );

            this.server.to(`session-${sessionId}`).emit('location-updated', location);

            return { success: true, location };
        } catch (error) {
            console.error(`[update-location] Error:`, error.message);
            const errorResponse = { success: false, error: error.message || 'Failed to update location' };
            client.emit('update-location-error', errorResponse);
            return errorResponse;
        }
    }
}