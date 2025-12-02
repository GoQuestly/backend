import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer,} from '@nestjs/websockets';
import {Server} from 'socket.io';
import {LocationService} from './location.service';
import {JwtService} from '@nestjs/jwt';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {QuestSessionEntity} from '@/common/entities/quest-session.entity';
import {ParticipantStatus} from '@/common/enums/participant-status';
import {UpdateLocationDto} from "@/quest-session/dto/update-location.dto";
import {UserEntity} from '@/common/entities/user.entity';
import {AbstractSessionGateway} from './abstract-session.gateway';
import {AuthenticatedSocket, ErrorResponse} from './gateway.types';
import {forwardRef, Inject} from '@nestjs/common';
import {QuestPointEntity} from '@/common/entities/quest-point.entity';
import {ParticipantPointEntity} from '@/common/entities/participant-point.entity';
import {ParticipantEntity} from '@/common/entities/participant.entity';
import {ParticipantTaskEntity} from '@/common/entities/participant-task.entity';
import {RejectionReason} from '@/common/enums/rejection-reason';
import {calculateDistance, POINT_COMPLETION_RADIUS_METERS} from './participant-task.constants';
import {isSessionActive} from '@/common/utils/session.util';

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    namespace: '/active-session',
})
export class ActiveSessionGateway extends AbstractSessionGateway {
    @WebSocketServer()
    server: Server;

    protected gatewayName = 'active-session';
    private sessionParticipants: Map<number, Set<string>> = new Map();

    constructor(
        @Inject(forwardRef(() => LocationService))
        private locationService: LocationService,
        protected jwtService: JwtService,
        @InjectRepository(QuestSessionEntity)
        protected sessionRepository: Repository<QuestSessionEntity>,
        @InjectRepository(QuestPointEntity)
        private questPointRepository: Repository<QuestPointEntity>,
        @InjectRepository(ParticipantPointEntity)
        private participantPointRepository: Repository<ParticipantPointEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        @InjectRepository(ParticipantTaskEntity)
        private participantTaskRepository: Repository<ParticipantTaskEntity>,
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

            if (!isOrganizer && participant && (participant.participationStatus === ParticipantStatus.REJECTED || participant.participationStatus === ParticipantStatus.DISQUALIFIED)) {
                const message = participant.participationStatus === ParticipantStatus.REJECTED
                    ? 'You have been rejected from this session'
                    : 'You have been disqualified from this session';
                return this.emitError(client, 'join-session-error', message,
                    `[join-session] User ${client.userId} status: ${participant.participationStatus} in session ${sessionId}`);
            }

            if (!isSessionActive(session)) {
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

            if (client.sessionId !== sessionId) {
                return this.emitError(client, 'leave-session-error', 'You are not connected to this session',
                    `[leave-session] User ${client.userId} is not connected to session ${sessionId}`);
            }

            const session = await this.getSessionWithRelations(sessionId);

            if (!session) {
                return this.emitError(client, 'leave-session-error', 'Session not found',
                    `[leave-session] Session ${sessionId} not found`);
            }

            const isOrganizer = this.isOrganizer(session, client.userId);
            const participant = this.getParticipant(session, client.userId);
            const isParticipant = !!participant;

            if (!isOrganizer && !isParticipant) {
                return this.emitError(client, 'leave-session-error', 'You do not have access to this session',
                    `[leave-session] User ${client.userId} has no access to session ${sessionId}`);
            }

            if (!isOrganizer && participant && (participant.participationStatus === ParticipantStatus.REJECTED || participant.participationStatus === ParticipantStatus.DISQUALIFIED)) {
                const message = participant.participationStatus === ParticipantStatus.REJECTED
                    ? 'You have been rejected from this session'
                    : 'You have been disqualified from this session';
                return this.emitError(client, 'leave-session-error', message,
                    `[leave-session] User ${client.userId} status: ${participant.participationStatus} in session ${sessionId}`);
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

            const isOrganizer = this.isOrganizer(session, client.userId);
            const participant = this.getParticipant(session, client.userId);
            const isParticipant = !!participant;

            if (!isOrganizer && !isParticipant) {
                return this.emitError(client, 'update-location-error', 'You do not have access to this session',
                    `[update-location] User ${client.userId} has no access to session ${sessionId}`);
            }

            if (!isOrganizer && participant && (participant.participationStatus === ParticipantStatus.REJECTED || participant.participationStatus === ParticipantStatus.DISQUALIFIED)) {
                const message = participant.participationStatus === ParticipantStatus.REJECTED
                    ? 'You have been rejected from this session'
                    : 'You have been disqualified from this session';
                return this.emitError(client, 'update-location-error', message,
                    `[update-location] User ${client.userId} status: ${participant.participationStatus} in session ${sessionId}`);
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

            const pointPassedResult = await this.checkAndPassPoint(sessionId, client.userId, latitude, longitude);

            if (pointPassedResult) {
                client.emit('point-passed', pointPassedResult);

                await this.notifyOrganizerPointPassed(sessionId, session.quest.organizer.userId, {
                    ...pointPassedResult,
                    userId: client.userId,
                    userName: participant.user.name,
                });
            }

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

            this.server.to(`session-${sessionId}`).emit('participant-rejected', rejectionEvent);

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
            console.error('[active-session:notify] Error handling participant rejection:', error.message);
        }
    }

    async notifyParticipantDisqualified(sessionId: number, participant: any): Promise<void> {
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

            const disqualificationEvent = {
                participantId: participant.participantId,
                userId: participant.user.userId,
                userName: participant.user.name,
                sessionId,
                rejectionReason: participant.rejectionReason || 'Unknown',
                disqualifiedAt: new Date(),
            };

            this.server.to(`session-${sessionId}`).emit('participant-disqualified', disqualificationEvent);

            const allSockets = await this.server.fetchSockets();

            const participantSockets = allSockets.filter(
                socket => (socket as unknown as AuthenticatedSocket).userId === participant.user.userId
            );

            for (const socket of participantSockets) {
                socket.emit('participant-disqualified', disqualificationEvent);

                await new Promise(resolve => setTimeout(resolve, 100));

                socket.disconnect(true);
            }

        } catch (error) {
            console.error('[active-session:notify] Error handling participant disqualification:', error.message);
        }
    }

    async notifySessionCancelled(sessionId: number, organizerName: string): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            const cancellationEvent = {
                sessionId,
                cancelledBy: organizerName,
                cancelledAt: new Date(),
                message: 'Session has been cancelled by the organizer',
            };

            this.server.to(`session-${sessionId}`).emit('session-cancelled', cancellationEvent);

            console.log(`[active-session:notify] Session ${sessionId} cancellation broadcasted`);
        } catch (error) {
            console.error('[active-session:notify] Error broadcasting session cancellation:', error.message);
        }
    }

    private async checkAndPassPoint(
        sessionId: number,
        userId: number,
        latitude: number,
        longitude: number
    ): Promise<{ pointPassed: boolean; pointName: string; orderNumber: number; questPointId: number } | null> {
        try {
            const session = await this.sessionRepository.findOne({
                where: {questSessionId: sessionId},
                relations: ['quest', 'quest.points', 'participants', 'participants.user', 'participants.points', 'participants.points.point'],
            });

            if (!session) {
                return null;
            }

            const participant = session.participants.find(p => p.user.userId === userId);

            if (!participant) {
                return null;
            }

            const questPoints = [...(session.quest.points || [])].sort((a, b) => a.orderNum - b.orderNum);

            if (questPoints.length === 0) {
                return null;
            }

            const passedPointIds = new Set(
                (participant?.points || []).map(pp => pp.point.questPointId)
            );

            let nextPoint: QuestPointEntity | null = null;

            let maxPassedOrderNum = -1;
            for (const qp of questPoints) {
                if (passedPointIds.has(qp.questPointId)) {
                    maxPassedOrderNum = Math.max(maxPassedOrderNum, qp.orderNum);
                }
            }

            for (const point of questPoints) {
                if (passedPointIds.has(point.questPointId)) {
                    continue;
                }

                const isFirstPoint = point.orderNum === questPoints[0].orderNum;
                const isNextPoint = point.orderNum === maxPassedOrderNum + 1;

                if (isFirstPoint || isNextPoint) {
                    nextPoint = point;
                    break;
                }
            }

            if (!nextPoint) {
                return null;
            }

            if (maxPassedOrderNum >= 0) {
                const previousPoint = questPoints.find(p => p.orderNum === maxPassedOrderNum);

                if (previousPoint) {
                    const previousPointWithTask = await this.questPointRepository.findOne({
                        where: { questPointId: previousPoint.questPointId },
                        relations: ['task'],
                    });

                    if (previousPointWithTask?.task) {
                        const participantTask = await this.participantTaskRepository.findOne({
                            where: {
                                participant: { participantId: participant.participantId },
                                task: { questTaskId: previousPointWithTask.task.questTaskId },
                            },
                            relations: ['task'],
                        });

                        if (!participantTask || !participantTask.completedDate) {
                            console.log(`[checkAndPassPoint] User ${userId} cannot proceed - task not completed at point ${previousPoint.questPointId}`);
                            return null;
                        }

                        if (previousPointWithTask.task.isRequiredForNextPoint) {
                            const task = previousPointWithTask.task;
                            const scorePercentage = (participantTask.scoreEarned / task.maxScorePointsCount) * 100;

                            if (scorePercentage < task.successScorePointsPercent) {
                                participant.participationStatus = ParticipantStatus.DISQUALIFIED;
                                participant.rejectionReason = RejectionReason.REQUIRED_TASK_NOT_COMPLETED;
                                await this.participantRepository.save(participant);

                                await this.notifyParticipantDisqualified(sessionId, participant);

                                console.log(`[checkAndPassPoint] User ${userId} disqualified - required task score ${scorePercentage.toFixed(1)}% < ${task.successScorePointsPercent}% at point ${previousPoint.questPointId}`);
                                return null;
                            }
                        }
                    }
                }
            }

            const distance = calculateDistance(latitude, longitude, nextPoint.latitude, nextPoint.longitude);

            console.log(`[checkAndPassPoint] User ${userId} distance to point ${nextPoint.questPointId}: ${distance}m (threshold: ${POINT_COMPLETION_RADIUS_METERS}m)`);

            if (distance <= POINT_COMPLETION_RADIUS_METERS) {
                const alreadyPassed = await this.participantPointRepository.findOne({
                    where: {
                        participant: {participantId: participant.participantId},
                        point: {questPointId: nextPoint.questPointId},
                    },
                });

                if (alreadyPassed) {
                    console.log(`[checkAndPassPoint] Point ${nextPoint.questPointId} already passed by user ${userId}`);
                    return null;
                }

                const participantPoint = this.participantPointRepository.create({
                    participant,
                    point: nextPoint,
                    passedDate: new Date(),
                });

                await this.participantPointRepository.save(participantPoint);

                console.log(`[checkAndPassPoint] User ${userId} passed point ${nextPoint.questPointId}`);

                return {
                    pointPassed: true,
                    pointName: nextPoint.name,
                    orderNumber: nextPoint.orderNum,
                    questPointId: nextPoint.questPointId,
                };
            }

            return null;
        } catch (error) {
            console.error(`[checkAndPassPoint] Error:`, error.message);
            return null;
        }
    }

    private async notifyOrganizerPointPassed(
        sessionId: number,
        organizerUserId: number,
        data: {
            pointPassed: boolean;
            pointName: string;
            orderNumber: number;
            questPointId: number;
            userId: number;
            userName: string;
        }
    ): Promise<void> {
        try {
            const organizerSockets = await this.server.in(`session-${sessionId}`).fetchSockets();

            for (const socket of organizerSockets) {
                const authSocket = socket as unknown as AuthenticatedSocket;
                if (authSocket.userId === organizerUserId) {
                    socket.emit('participant-point-passed', data);
                    console.log(`[notifyOrganizerPointPassed] Notified organizer ${organizerUserId} about participant ${data.userId} passing point ${data.questPointId}`);
                }
            }
        } catch (error) {
            console.error(`[notifyOrganizerPointPassed] Error:`, error.message);
        }
    }

    async notifyTaskCompleted(
        sessionId: number,
        organizerUserId: number,
        data: {
            userId: number;
            userName: string;
            taskId: number;
            pointName: string;
            scoreEarned: number;
            totalScore: number;
            completedAt: Date;
        }
    ): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            const taskCompletedEvent = {
                ...data,
                sessionId,
            };

            const organizerSockets = await this.server.in(`session-${sessionId}`).fetchSockets();

            for (const socket of organizerSockets) {
                const authSocket = socket as unknown as AuthenticatedSocket;
                if (authSocket.userId === organizerUserId) {
                    socket.emit('task-completed', taskCompletedEvent);
                }
            }

            console.log(`[active-session:notify] Task completed by user ${data.userId} - notified organizer ${organizerUserId}`);
        } catch (error) {
            console.error('[active-session:notify] Error notifying organizer about task completion:', error.message);
        }
    }

    async notifyScoresUpdated(
        sessionId: number,
        scores: {
            userId: number;
            userName: string;
            totalScore: number;
            completedTasksCount: number;
        }[]
    ): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            const scoresUpdatedEvent = {
                sessionId,
                participants: scores,
                updatedAt: new Date(),
            };

            this.server.to(`session-${sessionId}`).emit('scores-updated', scoresUpdatedEvent);

            console.log(`[active-session:notify] Scores updated in session ${sessionId}`);
        } catch (error) {
            console.error('[active-session:notify] Error broadcasting scores update:', error.message);
        }
    }

    async notifyPhotoSubmitted(
        sessionId: number,
        organizerUserId: number,
        data: {
            participantTaskPhotoId: number;
            participantTaskId: number;
            userId: number;
            userName: string;
            questTaskId: number;
            taskDescription: string;
            pointName: string;
            photoUrl: string;
            uploadDate: Date;
        }
    ): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            const photoSubmittedEvent = {
                ...data,
                sessionId,
            };

            const organizerSockets = await this.server.in(`session-${sessionId}`).fetchSockets();

            for (const socket of organizerSockets) {
                const authSocket = socket as unknown as AuthenticatedSocket;
                if (authSocket.userId === organizerUserId) {
                    socket.emit('photo-submitted', photoSubmittedEvent);
                }
            }

            console.log(`[active-session:notify] Photo submitted by user ${data.userId} in session ${sessionId}`);
        } catch (error) {
            console.error('[active-session:notify] Error notifying organizer about photo submission:', error.message);
        }
    }

    async notifyPhotoModerated(
        sessionId: number,
        organizerUserId: number,
        participantUserId: number,
        data: {
            participantTaskPhotoId: number;
            participantTaskId: number;
            userId: number;
            userName: string;
            questTaskId: number;
            taskDescription: string;
            pointName: string;
            photoUrl: string;
            approved: boolean;
            rejectionReason?: string;
            scoreAdjustment: number;
            totalScore: number;
        }
    ): Promise<void> {
        try {
            if (!sessionId || sessionId <= 0) {
                return;
            }

            const photoModeratedEvent = {
                ...data,
                sessionId,
                moderatedAt: new Date(),
            };

            const allSockets = await this.server.in(`session-${sessionId}`).fetchSockets();

            for (const socket of allSockets) {
                const authSocket = socket as unknown as AuthenticatedSocket;

                if (authSocket.userId === participantUserId) {
                    socket.emit('photo-moderated', photoModeratedEvent);
                }

                if (authSocket.userId === organizerUserId) {
                    socket.emit('photo-moderated', photoModeratedEvent);
                }
            }

            console.log(`[active-session:notify] Photo ${data.approved ? 'approved' : 'rejected'} for user ${participantUserId} in session ${sessionId}`);
        } catch (error) {
            console.error('[active-session:notify] Error notifying about photo moderation:', error.message);
        }
    }
}