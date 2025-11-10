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
import { ParticipantStatus } from '@/common/enums/ParticipantStatus';
import { UpdateLocationDto } from "@/quest-session/dto/update-location.dto";
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { UserEntity } from '@/common/entities/UserEntity';

interface AuthenticatedSocket extends Socket {
    userId?: number;
    sessionId?: number;
}

interface ErrorResponse {
    success: false;
    error: string;
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

    async handleDisconnect(client: AuthenticatedSocket) {
        console.log(`Client disconnected: ${client.id}`);

        if (client.sessionId && client.userId) {
            const sessionId = client.sessionId;

            try {
                const session = await this.getSessionWithRelations(sessionId);

                if (session) {
                    const isOrganizer = this.isOrganizer(session, client.userId);
                    const currentUser = this.getCurrentUser(session, client.userId, isOrganizer);

                    if (currentUser && !isOrganizer) {
                        this.notifyUserLeft(sessionId, currentUser);
                    }
                }
            } catch (error) {
                console.error(`[handleDisconnect] Error notifying organizer:`, error.message);
            }

            this.removeParticipantFromTracking(sessionId, client.id);
        }
    }

    @SubscribeMessage('join-session')
    async handleJoinSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        try {
            const { sessionId } = data;

            console.log(`[join-session] User ${client.userId} attempting to join session ${sessionId}`);

            const session = await this.getSessionWithRelations(sessionId);

            if (!session) {
                return this.emitError(client, 'join-session-error', 'Session not found',
                    `[join-session] Session ${sessionId} not found`);
            }

            const isOrganizer = this.isOrganizer(session, client.userId);
            const participant = this.getParticipant(session, client.userId);
            const isParticipant = !!participant;

            if (!isOrganizer && !isParticipant) {
                return this.emitError(client, 'join-session-error', 'You do not have access to this session',
                    `[join-session] User ${client.userId} has no access to session ${sessionId}`);
            }

            if (!isOrganizer && participant && participant.participationStatus === ParticipantStatus.REJECTED) {
                return this.emitError(client, 'join-session-error', 'You have been rejected from this session',
                    `[join-session] User ${client.userId} has been rejected from session ${sessionId}`);
            }

            if (!this.isSessionActive(session)) {
                return this.emitError(client, 'join-session-error', 'Session is not active',
                    `[join-session] Session ${sessionId} is not active`);
            }

            if (client.sessionId === sessionId) {
                return this.emitError(client, 'join-session-error', 'You are already connected to this session',
                    `[join-session] User ${client.userId} already joined session ${sessionId}`);
            }

            client.sessionId = sessionId;
            client.join(`session-${sessionId}`);

            this.addParticipantToTracking(sessionId, client.id);

            console.log(`[join-session] User ${client.userId} successfully joined session ${sessionId}`);

            const currentUser = this.getCurrentUser(session, client.userId, isOrganizer);

            if (currentUser && !isOrganizer) {
                this.notifyUserJoined(sessionId, currentUser);
            }

            return {
                success: true,
                message: 'Joined session',
            };
        } catch (error) {
            console.error(`[join-session] Error:`, error);
            const errorResponse: ErrorResponse = { success: false, error: error.message || 'Unknown error occurred' };
            client.emit('join-session-error', errorResponse);
            return errorResponse;
        }
    }

    @SubscribeMessage('leave-session')
    async handleLeaveSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number }
    ) {
        try {
            const { sessionId } = data;
            console.log(`[leave-session] User ${client.userId} leaving session ${sessionId}`);

            const session = await this.getSessionWithRelations(sessionId);

            if (!session) {
                return this.emitError(client, 'leave-session-error', 'Session not found',
                    `[leave-session] Session ${sessionId} not found`);
            }

            const isOrganizer = this.isOrganizer(session, client.userId);
            const isParticipant = session.participants.some(p => p.user.userId === client.userId);

            if (!isOrganizer && !isParticipant) {
                return this.emitError(client, 'leave-session-error', 'You are not a participant or organizer of this session',
                    `[leave-session] User ${client.userId} is not a participant or organizer of session ${sessionId}`);
            }

            const currentUser = this.getCurrentUser(session, client.userId, isOrganizer);

            client.leave(`session-${sessionId}`);
            client.sessionId = undefined;

            this.removeParticipantFromTracking(sessionId, client.id);

            if (currentUser && !isOrganizer) {
                this.notifyUserLeft(sessionId, currentUser);
            }

            return { success: true, message: 'Left session', sessionId };
        } catch (error) {
            console.error(`[leave-session] Error:`, error);
            const errorResponse: ErrorResponse = { success: false, error: error.message || 'Unknown error occurred' };
            client.emit('leave-session-error', errorResponse);
            return errorResponse;
        }
    }

    @SubscribeMessage('update-location')
    async handleLocationUpdate(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: number; latitude: number; longitude: number }
    ) {
        try {
            const { sessionId, latitude, longitude } = data;

            if (client.sessionId !== sessionId) {
                return this.emitError(client, 'update-location-error', 'You are not connected to this session',
                    `[update-location] User ${client.userId} not connected to session ${sessionId}`);
            }

            const session = await this.getSessionWithRelations(sessionId);

            if (!session) {
                return this.emitError(client, 'update-location-error', 'Session not found',
                    `[update-location] Session ${sessionId} not found`);
            }

            const participant = this.getParticipant(session, client.userId);
            if (participant && participant.participationStatus === ParticipantStatus.REJECTED) {
                return this.emitError(client, 'update-location-error', 'You have been rejected from this session',
                    `[update-location] User ${client.userId} has been rejected from session ${sessionId}`);
            }

            const coordinatesError = this.validateCoordinates(latitude, longitude);
            if (coordinatesError) {
                return this.emitError(client, 'update-location-error', coordinatesError);
            }

            const locationDto: UpdateLocationDto = { latitude, longitude };

            const location = await this.locationService.updateLocation(
                sessionId,
                client.userId,
                locationDto
            );

            await this.notifyOrganizerLocationUpdate(sessionId, session.quest.organizer.userId, location);

            return { success: true, location };
        } catch (error) {
            console.error(`[update-location] Error:`, error.message);
            const errorResponse: ErrorResponse = { success: false, error: error.message || 'Failed to update location' };
            client.emit('update-location-error', errorResponse);
            return errorResponse;
        }
    }

    private async getSessionWithRelations(sessionId: number): Promise<QuestSessionEntity | null> {
        return this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });
    }

    private isOrganizer(session: QuestSessionEntity, userId: number): boolean {
        return session.quest.organizer.userId === userId;
    }

    private getParticipant(session: QuestSessionEntity, userId: number): ParticipantEntity | undefined {
        return session.participants.find(p => p.user.userId === userId);
    }

    private getCurrentUser(session: QuestSessionEntity, userId: number, isOrganizer: boolean): UserEntity | null {
        const participant = this.getParticipant(session, userId);
        return participant?.user || (isOrganizer ? session.quest.organizer : null);
    }

    private isSessionActive(session: QuestSessionEntity): boolean {
        const now = new Date();

        if (session.endReason) {
            return false;
        }

        if (now < session.startDate) {
            return false;
        }

        if (session.endDate) {
            return session.endDate > now;
        }

        const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
        const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

        return now < maxEndTime;
    }

    private emitError(
        client: AuthenticatedSocket,
        event: string,
        errorMessage: string,
        logMessage?: string
    ): ErrorResponse {
        if (logMessage) {
            console.error(logMessage);
        }
        const errorResponse: ErrorResponse = { success: false, error: errorMessage };
        client.emit(event, errorResponse);
        return errorResponse;
    }

    private notifyUserJoined(sessionId: number, user: UserEntity): void {
        this.server.to(`session-${sessionId}`).emit('user-joined', {
            userId: user.userId,
            userName: user.name,
            sessionId: sessionId,
        });
    }

    private notifyUserLeft(sessionId: number, user: UserEntity): void {
        this.server.to(`session-${sessionId}`).emit('user-left', {
            userId: user.userId,
            userName: user.name,
            sessionId: sessionId,
        });
    }

    private async notifyOrganizerLocationUpdate(sessionId: number, organizerUserId: number, location: any): Promise<void> {
        const organizerSockets = await this.server.in(`session-${sessionId}`).fetchSockets();

        for (const socket of organizerSockets) {
            const authSocket = socket as unknown as AuthenticatedSocket;
            if (authSocket.userId === organizerUserId) {
                socket.emit('location-updated', location);
            }
        }
    }

    private validateCoordinates(latitude: number, longitude: number): string | null {
        if (latitude < -90 || latitude > 90) {
            return latitude > 90
                ? 'Latitude cannot be greater than 90'
                : 'Latitude cannot be less than -90';
        }

        if (longitude < -180 || longitude > 180) {
            return longitude > 180
                ? 'Longitude cannot be greater than 180'
                : 'Longitude cannot be less than -180';
        }

        return null;
    }

    private addParticipantToTracking(sessionId: number, clientId: string): void {
        if (!this.sessionParticipants.has(sessionId)) {
            this.sessionParticipants.set(sessionId, new Set());
        }
        this.sessionParticipants.get(sessionId).add(clientId);
    }

    private removeParticipantFromTracking(sessionId: number, clientId: string): void {
        const participants = this.sessionParticipants.get(sessionId);
        if (participants) {
            participants.delete(clientId);
            if (participants.size === 0) {
                this.sessionParticipants.delete(sessionId);
            }
        }
    }
}
