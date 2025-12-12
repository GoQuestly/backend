import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException
} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {isSessionActive} from '@/common/utils/session.util';
import {Repository} from 'typeorm';
import {QuestSessionEntity} from '@/common/entities/quest-session.entity';
import {ParticipantEntity} from '@/common/entities/participant.entity';
import {QuestEntity} from '@/common/entities/quest.entity';
import {UserEntity} from '@/common/entities/user.entity';
import {QuestSessionEndReason} from '@/common/enums/quest-session-end-reason';
import {ParticipantStatus} from '@/common/enums/participant-status';
import {TaskStatus} from '@/common/enums/task-status';
import {QuestTaskType} from '@/common/enums/quest-task-type';
import {QuestSessionDto} from './dto/quest-session.dto';
import {randomBytes} from 'crypto';
import {JoinSessionDto} from "@/quest-session/dto/join-session.dto";
import {QuestSessionResponseDto} from "@/quest-session/dto/quest-session-response.dto";
import {QuestSessionListResponseDto} from "@/quest-session/dto/quest-session-list-response.dto";
import {SessionPointResponseDto} from "@/quest-session/dto/session-point-response.dto";
import {SessionResultsResponseDto} from './dto/session-results-response.dto';
import {SessionEventsGateway} from './session-events.gateway';
import {ActiveSessionGateway} from './active-session.gateway';
import {LocationService} from './location.service';
import {NotificationService} from '@/notification/notification.service';
import {REQUEST} from '@nestjs/core';
import {Request} from 'express';
import {getAbsoluteUrl} from '@/common/utils/url.util';
import {ParticipantRankingDto} from "@/quest-session/dto/participant-ranking.dto";
import {OrganizerSessionResultsResponseDto} from "@/quest-session/dto/organizer-session-results-response.dto";
import {SessionStatisticsDto} from "@/quest-session/dto/session-statistics.dto";
import {ParticipantRankingWithRouteDto} from "@/quest-session/dto/participant-ranking-with-route.dto";

@Injectable()
export class QuestSessionService {
    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        @InjectRepository(QuestEntity)
        private questRepository: Repository<QuestEntity>,
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @Inject(forwardRef(() => SessionEventsGateway))
        private participantGateway: SessionEventsGateway,
        @Inject(forwardRef(() => ActiveSessionGateway))
        private activeSessionGateway: ActiveSessionGateway,
        @Inject(forwardRef(() => LocationService))
        private locationService: LocationService,
        private notificationService: NotificationService,
        @Inject(REQUEST) private readonly request: Request,
    ) {}

    private generateInviteToken(): string {
        return randomBytes(16).toString('hex');
    }


    async create(questId: number, dto: QuestSessionDto, organizerId: number): Promise<QuestSessionResponseDto> {
        const quest = await this.questRepository.findOne({
            where: { questId },
            relations: ['organizer', 'points'],
        });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${questId} not found`);
        }

        if (quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can create sessions');
        }

        if (!quest.points || quest.points.length === 0) {
            throw new BadRequestException('Cannot create session for a quest without points');
        }

        const startDate = new Date(dto.startDate);
        const now = new Date();

        if (startDate < now) {
            throw new BadRequestException('Start date cannot be in the past');
        }

        const questDurationMs = quest.maxDurationMinutes * 60 * 1000;

        const existingSessions = await this.sessionRepository.find({
            where: { quest: { questId } },
        });

        for (const existingSession of existingSessions) {
            if (existingSession.endReason !== null) {
                continue;
            }

            const existingStart = existingSession.startDate.getTime();
            const newStart = startDate.getTime();

            if (Math.abs(newStart - existingStart) < questDurationMs) {
                throw new BadRequestException(
                    `Session is too close to another session. Minimum interval is ${quest.maxDurationMinutes} minutes`
                );
            }
        }

        let inviteToken: string;
        let isUnique = false;

        while (!isUnique) {
            inviteToken = this.generateInviteToken();
            const existing = await this.sessionRepository.findOne({
                where: { inviteToken },
            });
            isUnique = !existing;
        }

        const session = this.sessionRepository.create({
            quest,
            startDate,
            endDate: null,
            inviteToken,
            endReason: null,
        });

        await this.sessionRepository.save(session);
        return this.findById(session.questSessionId);
    }

    async findById(id: number, userId?: number, requireOrganizer: boolean = false): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: id },
            relations: ['quest', 'quest.organizer', 'quest.points', 'participants', 'participants.user', 'participants.points'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${id} not found`);
        }

        let currentParticipant: ParticipantEntity | undefined;

        if (userId) {
            const isOrganizer = session.quest.organizer.userId === userId;
            currentParticipant = session.participants.find(p => p.user.userId === userId);

            if (requireOrganizer) {
                if (!isOrganizer) {
                    throw new ForbiddenException('Only the quest organizer can access this session');
                }
            } else {
                if (!isOrganizer && !currentParticipant) {
                    throw new ForbiddenException('You do not have access to this session');
                }
            }
        }

        return this.mapToResponseDto(session);
    }

    async findByQuestId(
        questId: number,
        organizerId: number,
        pageNumber: number = 1,
        pageSize: number = 10,
    ): Promise<{ items: QuestSessionListResponseDto[]; total: number; pageNumber: number; pageSize: number }> {
        const quest = await this.questRepository.findOne({
            where: { questId },
            relations: ['organizer'],
        });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${questId} not found`);
        }

        if (quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can view quest sessions');
        }

        const qb = this.sessionRepository.createQueryBuilder('session')
            .leftJoinAndSelect('session.quest', 'quest')
            .leftJoinAndSelect('session.participants', 'participants')
            .where('quest.questId = :questId', { questId })
            .orderBy('session.startDate', 'DESC')
            .skip((pageNumber - 1) * pageSize)
            .take(pageSize);

        const [entities, total] = await qb.getManyAndCount();

        const items = entities.map(session => this.mapToListResponseDto(session));

        return {
            items,
            total,
            pageNumber,
            pageSize,
        };
    }

    async findUserSessions(
        userId: number,
        limit: number = 10,
        offset: number = 0,
    ): Promise<{ items: QuestSessionListResponseDto[]; total: number; limit: number; offset: number }> {
        const qb = this.participantRepository.createQueryBuilder('participant')
            .leftJoinAndSelect('participant.session', 'session')
            .leftJoinAndSelect('session.quest', 'quest')
            .leftJoinAndSelect('quest.points', 'questPoints')
            .leftJoinAndSelect('session.participants', 'participants')
            .leftJoinAndSelect('participant.points', 'participantPoints')
            .where('participant.user.userId = :userId', { userId })
            .orderBy('session.startDate', 'DESC')
            .skip(offset)
            .take(limit);

        const [participants, total] = await qb.getManyAndCount();

        const items = participants.map(p => this.mapToListResponseDto(p.session, p));

        return {
            items,
            total,
            limit,
            offset,
        };
    }

    async update(id: number, dto: QuestSessionDto, organizerId: number): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: id },
            relations: ['quest', 'quest.organizer'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${id} not found`);
        }

        if (session.quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can update the session');
        }

        if (session.endReason) {
            throw new BadRequestException('Cannot update a session that has ended or been cancelled');
        }

        const now = new Date();
        if (session.startDate <= now) {
            throw new BadRequestException('Cannot update a session that has already started');
        }

        const startDate = new Date(dto.startDate);

        if (startDate < now) {
            throw new BadRequestException('Start date cannot be in the past');
        }

        const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;

        const existingSessions = await this.sessionRepository.find({
            where: { quest: { questId: session.quest.questId } },
        });

        for (const existingSession of existingSessions) {
            if (existingSession.questSessionId === id) continue;

            const existingStart = existingSession.startDate.getTime();
            const newStart = startDate.getTime();

            if (Math.abs(newStart - existingStart) < questDurationMs) {
                throw new BadRequestException(
                    `Session is too close to another session. Minimum interval is ${session.quest.maxDurationMinutes} minutes`
                );
            }
        }

        session.startDate = startDate;
        await this.sessionRepository.save(session);

        return this.findById(id);
    }

    async cancelSession(id: number, organizerId: number): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: id },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${id} not found`);
        }

        if (session.endReason) {
            throw new BadRequestException('Session is already ended');
        }

        if (session.quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can cancel the session');
        }

        session.endReason = QuestSessionEndReason.CANCELLED;
        session.endDate = new Date();

        await this.sessionRepository.save(session);

        const organizerName = session.quest.organizer.name;
        await Promise.all([
            this.activeSessionGateway.notifySessionCancelled(id, organizerName),
            this.participantGateway.notifySessionCancelled(id, organizerName),
        ]);

        await this.notificationService.sendSessionCancelledNotificationToMultiple(
            session.participants,
            id,
            session.quest.title
        );

        return this.findById(id);
    }

    async joinSession(dto: JoinSessionDto, userId: number): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { inviteToken: dto.inviteToken },
            relations: ['participants', 'participants.user', 'quest', 'quest.organizer'],
        });

        if (!session) {
            throw new NotFoundException('Session not found with this invite token');
        }

        const now = new Date();

        if (session.endReason) {
            throw new BadRequestException('This session has ended');
        }
        if (session.endDate && session.endDate < now) {
            throw new BadRequestException('This session has expired');
        }
        if (now >= session.startDate) {
            throw new BadRequestException('Cannot join: this session has already started');
        }

        if (session.quest.organizer.userId === userId) {
            throw new BadRequestException('Organizer cannot join their own session as participant');
        }

        const user = await this.userRepository.findOne({
            where: { userId },
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        const existingParticipant = await this.participantRepository.findOne({
            where: {
                session: { questSessionId: session.questSessionId },
                user: { userId },
            },
        });

        if (existingParticipant) {
            throw new ConflictException('User is already a participant in this session');
        }

        const activeParticipantsCount = session.participants.filter(
            p => p.participationStatus !== ParticipantStatus.REJECTED
        ).length;

        if (activeParticipantsCount >= session.quest.maxParticipantCount) {
            throw new BadRequestException(
                `Session is full. Maximum ${session.quest.maxParticipantCount} participants allowed`
            );
        }

        const participant = this.participantRepository.create({
            session,
            user,
        });

        await this.participantRepository.save(participant);

        await this.participantGateway.notifyParticipantJoined(participant);

        return this.findById(session.questSessionId);
    }

    async leaveSession(sessionId: number, userId: number): Promise<void> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (session.quest.organizer.userId === userId) {
            throw new BadRequestException('Organizer cannot leave their own session');
        }

        const now = new Date();
        const isStarted = !session.endReason && session.startDate <= now && (!session.endDate || session.endDate > now);

        if (isStarted) {
            throw new BadRequestException('Cannot leave session while it is active');
        }

        const participant = await this.participantRepository.findOne({
            where: {
                session: { questSessionId: sessionId },
                user: { userId },
            },
            relations: ['user', 'session'],
        });

        if (!participant) {
            throw new NotFoundException('Participant not found in this session');
        }

        await this.participantGateway.notifyParticipantLeft(sessionId, participant);

        await this.participantRepository.remove(participant);
    }

    async checkActiveSession(questId: number): Promise<void> {
        const sessions = await this.sessionRepository.find({
            where: { quest: { questId } },
            relations: ['quest'],
        });

        const now = new Date();
        for (const session of sessions) {
            if (session.endReason) {
                continue;
            }

            if (session.startDate > now) {
                continue;
            }

            if (session.endDate) {
                if (session.endDate > now) {
                    throw new BadRequestException(
                        'Cannot modify quest or points while an active session exists'
                    );
                }
                continue;
            }

            const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
            const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

            if (now < maxEndTime) {
                throw new BadRequestException(
                    'Cannot modify quest or points while an active session exists'
                );
            }
        }
    }

    async getSessionPoints(sessionId: number, userId: number): Promise<SessionPointResponseDto[]> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: ['quest', 'quest.organizer', 'quest.points', 'quest.points.task', 'participants', 'participants.user', 'participants.points', 'participants.points.point', 'participants.tasks', 'participants.tasks.task', 'participants.tasks.task.point', 'participants.tasks.photo'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        const isOrganizer = session.quest.organizer.userId === userId;

        if (isOrganizer) {
            throw new ForbiddenException('Organizer cannot receive information about points through participant endpoint');
        }

        const participant = session.participants.find(p => p.user.userId === userId);

        if (!participant) {
            throw new ForbiddenException('You do not have access to this session');
        }

        if (participant.participationStatus === ParticipantStatus.DISQUALIFIED || participant.participationStatus === ParticipantStatus.REJECTED) {
            const message = participant.participationStatus === ParticipantStatus.REJECTED
                ? 'You have been rejected from this session'
                : 'You have been disqualified from this session';
            throw new ForbiddenException(message);
        }

        const questPoints = [...(session.quest.points || [])].sort((a, b) => a.orderNum - b.orderNum);

        const passedPointIds = new Set(
            (participant?.points || []).map(pp => pp.point.questPointId)
        );

        let maxPassedOrderNum = -1;
        for (const point of questPoints) {
            if (passedPointIds.has(point.questPointId)) {
                maxPassedOrderNum = Math.max(maxPassedOrderNum, point.orderNum);
            }
        }

        const firstPointOrderNum = questPoints[0]?.orderNum;

        return questPoints.map(point => {
            const isPassed = passedPointIds.has(point.questPointId);
            const isFirstPoint = point.orderNum === firstPointOrderNum;
            const isUnlocked = isFirstPoint || isPassed || point.orderNum === maxPassedOrderNum + 1;

            let taskStatus: TaskStatus | null = null;

            if (point.task && isUnlocked) {
                const participantTask = participant?.tasks?.find(
                    pt => pt.task?.point?.questPointId === point.questPointId
                );

                if (!participantTask || !participantTask.startDate) {
                    taskStatus = TaskStatus.NOT_STARTED;
                } else if (participantTask.completedDate) {
                    if (point.task.taskType === QuestTaskType.PHOTO) {
                        const photo = participantTask.photo;
                        if (photo && photo.isApproved === null) {
                            taskStatus = TaskStatus.IN_REVIEW;
                        } else {
                            const successThreshold = (point.task.maxScorePointsCount * point.task.successScorePointsPercent) / 100;
                            taskStatus = participantTask.scoreEarned >= successThreshold ? TaskStatus.COMPLETED_SUCCESS : TaskStatus.COMPLETED_FAILED;
                        }
                    } else {
                        const successThreshold = (point.task.maxScorePointsCount * point.task.successScorePointsPercent) / 100;
                        taskStatus = participantTask.scoreEarned >= successThreshold ? TaskStatus.COMPLETED_SUCCESS : TaskStatus.COMPLETED_FAILED;
                    }
                } else {
                    const now = new Date();
                    const elapsedSeconds = (now.getTime() - participantTask.startDate.getTime()) / 1000;

                    if (elapsedSeconds > point.task.maxDurationSeconds) {
                        taskStatus = TaskStatus.EXPIRED;
                    } else {
                        taskStatus = TaskStatus.IN_PROGRESS;
                    }
                }
            }

            return {
                pointId: point.questPointId,
                pointName: point.name,
                orderNumber: point.orderNum,
                isPassed,
                pointLatitude: isUnlocked ? point.latitude : null,
                pointLongitude: isUnlocked ? point.longitude : null,
                hasTask: point.task !== null,
                isTaskSuccessCompletionRequiredForNextPoint: point.task?.isRequiredForNextPoint ?? false,
                taskStatus,
            };
        });
    }

    async getParticipantScores(sessionId: number, userId: number, requireOrganizer: boolean = false, requireParticipant: boolean = false) {
        const session = await this.sessionRepository.findOne({
            where: {questSessionId: sessionId},
            relations: [
                'quest',
                'quest.organizer',
                'quest.points',
                'quest.points.task',
                'participants',
                'participants.user',
                'participants.tasks',
            ],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        const isOrganizer = session.quest.organizer.userId === userId;
        const participant = session.participants.find(p => p.user.userId === userId);
        const isParticipant = !!participant;

        if (requireOrganizer) {
            if (!isOrganizer) {
                throw new ForbiddenException('Only the quest organizer can access this endpoint');
            }
        } else if (requireParticipant) {
            if (isOrganizer) {
                throw new ForbiddenException('Only quest participants can access this endpoint');
            }
            if (!isParticipant) {
                throw new ForbiddenException('You do not have access to this session');
            }
            if (participant.participationStatus === ParticipantStatus.DISQUALIFIED || participant.participationStatus === ParticipantStatus.REJECTED) {
                const message = participant.participationStatus === ParticipantStatus.REJECTED
                    ? 'You have been rejected from this session'
                    : 'You have been disqualified from this session';
                throw new ForbiddenException(message);
            }
        } else {
            if (!isOrganizer && !isParticipant) {
                throw new ForbiddenException('You do not have access to this session');
            }
        }

        const totalTasksInQuest = session.quest.points.filter(p => p.task !== null).length;

        const participants = session.participants
            .filter(p => p.participationStatus === ParticipantStatus.APPROVED)
            .map(participant => {
                const completedTasks = participant.tasks?.filter(t => t.completedDate !== null) || [];
                const totalScore = completedTasks.reduce((sum, task) => sum + (task.scoreEarned || 0), 0);

                return {
                    participantId: participant.participantId,
                    userId: participant.user.userId,
                    userName: participant.user.name,
                    photoUrl: getAbsoluteUrl(this.request, participant.user.photoUrl),
                    totalScore,
                    completedTasksCount: completedTasks.length,
                };
            })
            .sort((a, b) => b.totalScore - a.totalScore);

        return {
            participants,
            totalTasksInQuest,
        };
    }

    async getSessionResults(
        sessionId: number,
        userId: number,
        requireOrganizer: boolean = false
    ): Promise<SessionResultsResponseDto | OrganizerSessionResultsResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: sessionId },
            relations: [
                'quest',
                'quest.organizer',
                'quest.points',
                'participants',
                'participants.user',
                'participants.points',
                'participants.tasks',
            ],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${sessionId} not found`);
        }

        if (!session.endReason) {
            throw new BadRequestException('Session results are only available after the session has ended');
        }

        const isOrganizer = session.quest.organizer.userId === userId;
        const participant = session.participants.find(p => p.user.userId === userId);
        const isParticipant = !!participant;

        if (requireOrganizer && !isOrganizer) {
            throw new ForbiddenException('Only the quest organizer can access this endpoint');
        }

        if (!requireOrganizer && !isOrganizer && !isParticipant) {
            throw new ForbiddenException('You do not have access to this session');
        }

        const sessionDurationSeconds = session.endDate
            ? Math.floor((session.endDate.getTime() - session.startDate.getTime()) / 1000)
            : 0;

        const finishedParticipants = session.participants.filter(
            p => p.participationStatus === ParticipantStatus.APPROVED && p.finishDate !== null
        );

        const rejectedParticipants = session.participants.filter(
            p => p.participationStatus === ParticipantStatus.REJECTED
        );

        const disqualifiedParticipants = session.participants.filter(
            p => p.participationStatus === ParticipantStatus.DISQUALIFIED
        );

        const statistics: SessionStatisticsDto = {
            sessionDurationSeconds,
            totalParticipantsCount: session.participants.length,
            finishedParticipantsCount: finishedParticipants.length,
            rejectedParticipantsCount: rejectedParticipants.length,
            disqualifiedParticipantsCount: disqualifiedParticipants.length,
        };

        const approvedParticipants = session.participants
            .filter(p => p.participationStatus === ParticipantStatus.APPROVED)
            .map(p => {
                const completedTasks = p.tasks?.filter(t => t.completedDate !== null) || [];
                const totalScore = completedTasks.reduce((sum, task) => sum + (task.scoreEarned || 0), 0);
                const passedCheckpointsCount = p.points?.length || 0;

                let completionTimeSeconds: number | null = null;
                if (p.finishDate) {
                    completionTimeSeconds = Math.floor((p.finishDate.getTime() - session.startDate.getTime()) / 1000);
                }

                return {
                    participantId: p.participantId,
                    userId: p.user.userId,
                    userName: p.user.name,
                    photoUrl: getAbsoluteUrl(this.request, p.user.photoUrl),
                    totalScore,
                    passedCheckpointsCount,
                    finishDate: p.finishDate,
                    completionTimeSeconds,
                };
            });

        approvedParticipants.sort((a, b) => {
            if (a.finishDate && !b.finishDate) return -1;
            if (!a.finishDate && b.finishDate) return 1;

            if (a.passedCheckpointsCount !== b.passedCheckpointsCount) {
                return b.passedCheckpointsCount - a.passedCheckpointsCount;
            }

            if (a.totalScore !== b.totalScore) {
                return b.totalScore - a.totalScore;
            }

            if (a.finishDate && b.finishDate && a.completionTimeSeconds && b.completionTimeSeconds) {
                return a.completionTimeSeconds - b.completionTimeSeconds;
            }

            return 0;
        });

        const rankings: ParticipantRankingDto[] = approvedParticipants.map((p, index) => ({
            rank: index + 1,
            ...p,
        }));

        if (isOrganizer) {
            const rankingsWithRoutes: ParticipantRankingWithRouteDto[] = [];

            for (const ranking of rankings) {
                const locationHistory = await this.locationService.getSessionLocations(
                    sessionId,
                    userId,
                    ranking.participantId
                );

                const route = locationHistory.routes.find(r => r.participantId === ranking.participantId);

                rankingsWithRoutes.push({
                    ...ranking,
                    route: route?.line || '',
                });
            }

            return {
                statistics,
                rankings: rankingsWithRoutes,
            } as OrganizerSessionResultsResponseDto;
        }

        return {
            statistics,
            rankings,
        } as SessionResultsResponseDto;
    }

    private mapToResponseDto(session: QuestSessionEntity): QuestSessionResponseDto {
        const questPoints = session.quest.points || [];
        const questPointCount = questPoints.length;

        const startPoint = questPoints.length > 0
            ? questPoints.reduce((min, point) => point.orderNum < min.orderNum ? point : min, questPoints[0])
            : null;

        return {
            questSessionId: session.questSessionId,
            questId: session.quest.questId,
            questTitle: session.quest.title,
            startDate: session.startDate,
            endDate: session.endDate,
            endReason: session.endReason,
            inviteToken: session.inviteToken,
            participants: (session.participants || []).map(p => ({
                participantId: p.participantId,
                userId: p.user.userId,
                userName: p.user.name,
                photoUrl: getAbsoluteUrl(this.request, p.user.photoUrl),
                joinedAt: p.createdAt,
                participationStatus: p.participationStatus,
                rejectionReason: p.rejectionReason,
                passedQuestPointCount: p.points?.length || 0,
            })),
            isActive: isSessionActive(session),
            participantCount: session.participants?.length || 0,
            questPointCount,
            questPhotoUrl: getAbsoluteUrl(this.request, session.quest.photoUrl),
            questDescription: session.quest.description,
            questMaxDurationMinutes: session.quest.maxDurationMinutes,
            startPointName: startPoint?.name || '',
        };
    }

    private mapToListResponseDto(session: QuestSessionEntity, participant?: ParticipantEntity): QuestSessionListResponseDto {
        const questPointCount = session.quest.points?.length || 0;
        const passedQuestPointCount = participant?.points?.length || 0;

        return {
            questSessionId: session.questSessionId,
            questId: session.quest.questId,
            questTitle: session.quest.title,
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: isSessionActive(session),
            participantCount: session.participants?.length || 0,
            questPointCount,
            passedQuestPointCount,
        };
    }
}