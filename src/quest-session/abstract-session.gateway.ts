import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { UserEntity } from '@/common/entities/UserEntity';
import { AuthenticatedSocket, ErrorResponse } from './gateway.types';

export abstract class AbstractSessionGateway implements OnGatewayConnection, OnGatewayDisconnect {
    abstract server: Server;
    protected abstract jwtService: JwtService;
    protected abstract sessionRepository: Repository<QuestSessionEntity>;
    protected abstract gatewayName: string;

    async handleConnection(client: AuthenticatedSocket): Promise<void> {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                console.error(`[${this.gatewayName}:connection] No token provided for client ${client.id}`);
                client.emit('error', {
                    success: false,
                    error: 'Authentication token is required',
                });
                setTimeout(() => client.disconnect(), 100);
                return;
            }

            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;

            console.log(`[${this.gatewayName}] Client connected: ${client.id}, userId: ${client.userId}`);
        } catch (error) {
            console.error(`[${this.gatewayName}:connection] Authentication error for client ${client.id}:`, error.message);
            client.emit('error', {
                success: false,
                error: error.name === 'TokenExpiredError'
                    ? 'Authentication token has expired'
                    : 'Invalid authentication token',
            });
            setTimeout(() => client.disconnect(), 100);
        }
    }

    async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
        console.log(`[${this.gatewayName}] Client disconnected: ${client.id}`);
    }

    protected async getSessionWithRelations(sessionId: number): Promise<QuestSessionEntity | null> {
        return this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });
    }

    protected isOrganizer(session: QuestSessionEntity, userId: number): boolean {
        return session.quest.organizer.userId === userId;
    }

    protected getParticipant(session: QuestSessionEntity, userId: number): ParticipantEntity | undefined {
        return session.participants.find(p => p.user.userId === userId);
    }

    protected getCurrentUser(session: QuestSessionEntity, userId: number, isOrganizer: boolean): UserEntity | null {
        const participant = this.getParticipant(session, userId);
        return participant?.user || (isOrganizer ? session.quest.organizer : null);
    }

    protected isSessionActive(session: QuestSessionEntity): boolean {
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

    protected emitError(
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
}