import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { LocationService } from './location.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantStatus } from '@/common/enums/ParticipantStatus';
import { UpdateLocationDto } from "@/quest-session/dto/update-location.dto";
import { UserEntity } from '@/common/entities/UserEntity';
import { AbstractSessionGateway } from './abstract-session.gateway';
import { AuthenticatedSocket, ErrorResponse } from './gateway.types';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/location',
})
export class LocationGateway extends AbstractSessionGateway {
    @WebSocketServer()
    server: Server;

    protected gatewayName = 'location';
    private sessionParticipants: Map<number, Set<string>> = new Map();

    constructor(
        @Inject(forwardRef(() => LocationService))
        private locationService: LocationService,
        protected jwtService: JwtService,
        @InjectRepository(QuestSessionEntity)
        protected sessionRepository: Repository<QuestSessionEntity>,
    ) {
        super();
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

    async notifyParticipantRejected(sessionId: number, participant: any): Promise<void> {
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

            const rejectionEvent = {
                participantId: participant.participantId,
                userId: participant.user.userId,
                userName: participant.user.name,
                sessionId,
                rejectionReason: participant.rejectionReason || 'Unknown',
                rejectedAt: new Date(),
            };

            const allSockets = await this.server.fetchSockets();

            const participantSockets = allSockets.filter(
                socket => (socket as unknown as AuthenticatedSocket).userId === participant.user.userId
            );

            for (const socket of participantSockets) {
                socket.emit('participant-rejected', rejectionEvent);

                await new Promise(resolve => setTimeout(resolve, 100));

                socket.disconnect(true);
            }

        } catch (error) {
            console.error('[location:notify] Error handling participant rejection:', error.message);
        }
    }
}
