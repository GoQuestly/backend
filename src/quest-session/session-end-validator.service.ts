import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/quest-session.entity';
import { ParticipantEntity } from '@/common/entities/participant.entity';
import { LocationService } from './location.service';
import { NotificationService } from '@/notification/notification.service';
import { ParticipantStatus } from '@/common/enums/participant-status';
import { QuestSessionEndReason } from '@/common/enums/quest-session-end-reason';

@Injectable()
export class SessionEndValidatorService {
    private readonly logger = new Logger(SessionEndValidatorService.name);

    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        private locationService: LocationService,
        private notificationService: NotificationService,
    ) {
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async validateSessionEnds() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

        try {
            await this.handleDurationBasedEnding(now, oneMinuteAgo);

            await this.handleEmptySessionsAtStart(now, oneMinuteAgo);
            await this.handleCompletedSessions(now);

        } catch (error) {
            this.logger.error(
                `Error in validateSessionEnds: ${error.message}`,
                error.stack
            );
        }
    }

    private async handleDurationBasedEnding(now: Date, oneMinuteAgo: Date) {
        const sessions = await this.sessionRepository
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.quest', 'quest')
            .leftJoinAndSelect('session.participants', 'participants')
            .where('session.endReason IS NULL')
            .andWhere(
                '(session.endDate BETWEEN :oneMinuteAgo AND :now) OR ' +
                "(session.endDate IS NULL AND " +
                "session.startDate + (quest.maxDurationMinutes * interval '1 minute') BETWEEN :oneMinuteAgo AND :now)",
                { oneMinuteAgo, now }
            )
            .getMany();

        if (sessions.length === 0) {
            return;
        }

        this.logger.log(`Found ${sessions.length} sessions that reached max duration`);

        for (const session of sessions) {
            this.logger.log(`Processing session ${session.questSessionId} for duration-based ending`);

            try {
                if (!session.endDate) {
                    const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
                    session.endDate = new Date(session.startDate.getTime() + questDurationMs);
                }

                session.endReason = QuestSessionEndReason.FINISHED;
                await this.sessionRepository.save(session);

                this.logger.log(
                    `Ended session ${session.questSessionId} - reason: max duration reached`
                );

                await this.locationService.rejectParticipantsWithoutLocation(
                    session.questSessionId
                );

                await this.sendSessionEndNotifications(session.questSessionId);
            } catch (error) {
                this.logger.error(
                    `Failed to end session ${session.questSessionId}: ${error.message}`,
                    error.stack
                );
            }
        }
    }

    private async handleEmptySessionsAtStart(now: Date, oneMinuteAgo: Date) {
        const sessions = await this.sessionRepository
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.participants', 'participants')
            .where('session.endReason IS NULL')
            .andWhere('session.startDate BETWEEN :oneMinuteAgo AND :now', { oneMinuteAgo, now })
            .getMany();

        if (sessions.length === 0) {
            return;
        }

        this.logger.log(`Checking ${sessions.length} newly started sessions for participants`);

        for (const session of sessions) {
            if (session.participants.length === 0) {
                this.logger.log(`Session ${session.questSessionId} started with no participants - ending immediately`);

                try {
                    session.endReason = QuestSessionEndReason.FINISHED;
                    session.endDate = new Date(session.startDate);
                    await this.sessionRepository.save(session);

                    this.logger.log(`Ended empty session ${session.questSessionId}`);
                } catch (error) {
                    this.logger.error(
                        `Failed to end empty session ${session.questSessionId}: ${error.message}`,
                        error.stack
                    );
                }
            }
        }
    }

    private async handleCompletedSessions(now: Date) {
        const activeSessions = await this.sessionRepository
            .createQueryBuilder('session')
            .leftJoinAndSelect('session.quest', 'quest')
            .leftJoinAndSelect('quest.points', 'questPoints')
            .leftJoinAndSelect('questPoints.task', 'questTask')
            .leftJoinAndSelect('session.participants', 'participants')
            .leftJoinAndSelect('participants.points', 'participantPoints')
            .leftJoinAndSelect('participants.tasks', 'participantTasks')
            .leftJoinAndSelect('participantTasks.photo', 'participantTaskPhoto')
            .where('session.endReason IS NULL')
            .andWhere('session.startDate <= :now', { now })
            .getMany();

        if (activeSessions.length === 0) {
            return;
        }

        this.logger.log(`Checking ${activeSessions.length} active sessions for completion`);

        for (const session of activeSessions) {
            try {
                const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
                const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

                if (now >= maxEndTime) {
                    continue;
                }

                const totalQuestPoints = session.quest.points.length;
                const totalQuestTasks = session.quest.points.filter(p => p.task !== null).length;
                const approvedParticipants = session.participants.filter(
                    p => p.participationStatus === ParticipantStatus.APPROVED
                );

                if (approvedParticipants.length === 0) {
                    this.logger.log(
                        `Session ${session.questSessionId} has no approved participants - ending`
                    );

                    session.endReason = QuestSessionEndReason.FINISHED;
                    session.endDate = now;
                    await this.sessionRepository.save(session);

                    await this.locationService.rejectParticipantsWithoutLocation(
                        session.questSessionId
                    );

                    await this.sendSessionEndNotifications(session.questSessionId);

                    continue;
                }

                const allFinished = approvedParticipants.every(p => {
                    const passedPointsCount = p.points?.length || 0;
                    const completedTasksCount = p.tasks?.filter(t => t.completedDate !== null).length || 0;
                    const hasUnmoderatedPhotos = p.tasks?.some(t =>
                        t.completedDate !== null &&
                        t.photo &&
                        t.photo.isApproved === null
                    ) || false;
                    return passedPointsCount === totalQuestPoints &&
                           completedTasksCount === totalQuestTasks &&
                           !hasUnmoderatedPhotos;
                });

                if (allFinished) {
                    this.logger.log(
                        `Session ${session.questSessionId} - all ${approvedParticipants.length} approved participants finished - ending`
                    );

                    session.endReason = QuestSessionEndReason.FINISHED;
                    session.endDate = now;
                    await this.sessionRepository.save(session);

                    await this.locationService.rejectParticipantsWithoutLocation(
                        session.questSessionId
                    );

                    await this.sendSessionEndNotifications(session.questSessionId);
                }

            } catch (error) {
                this.logger.error(
                    `Failed to check completion for session ${session.questSessionId}: ${error.message}`,
                    error.stack
                );
            }
        }
    }

    private async sendSessionEndNotifications(sessionId: number): Promise<void> {
        try {
            const session = await this.sessionRepository.findOne({
                where: { questSessionId: sessionId },
                relations: [
                    'quest',
                    'participants',
                    'participants.user',
                    'participants.points',
                    'participants.tasks',
                ],
            });

            if (!session) {
                this.logger.warn(`Session ${sessionId} not found for end notifications`);
                return;
            }

            const approvedParticipants = session.participants
                .filter(p => p.participationStatus === ParticipantStatus.APPROVED)
                .map(p => {
                    const completedTasks = p.tasks?.filter(t => t.completedDate !== null) || [];
                    const totalScore = completedTasks.reduce((sum, task) => sum + (task.scoreEarned || 0), 0);
                    const passedCheckpointsCount = p.points?.length || 0;
                    const finished = p.finishDate !== null;

                    return {
                        participant: p,
                        totalScore,
                        passedCheckpointsCount,
                        finished,
                    };
                });

            approvedParticipants.sort((a, b) => {
                if (a.finished && !b.finished) return -1;
                if (!a.finished && b.finished) return 1;

                if (a.passedCheckpointsCount !== b.passedCheckpointsCount) {
                    return b.passedCheckpointsCount - a.passedCheckpointsCount;
                }

                if (a.totalScore !== b.totalScore) {
                    return b.totalScore - a.totalScore;
                }

                return 0;
            });

            for (let i = 0; i < approvedParticipants.length; i++) {
                const { participant, totalScore, finished } = approvedParticipants[i];
                const rank = i + 1;

                await this.notificationService.sendSessionEndedNotification(
                    participant,
                    sessionId,
                    session.quest.title,
                    finished,
                    finished ? rank : undefined,
                    finished ? totalScore : undefined
                );
            }

            this.logger.log(
                `Sent session end notifications to ${approvedParticipants.length} participants for session ${sessionId}`
            );
        } catch (error) {
            this.logger.error(
                `Failed to send session end notifications for session ${sessionId}: ${error.message}`,
                error.stack
            );
        }
    }
}
