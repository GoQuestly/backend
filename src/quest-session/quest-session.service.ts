import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { QuestEntity } from '@/common/entities/QuestEntity';
import { UserEntity } from '@/common/entities/UserEntity';
import { QuestSessionEndReason } from '@/common/enums/QuestSessionEndReason';
import {
    QuestSessionDto,
    JoinSessionDto,
    QuestSessionResponseDto,
    QuestSessionListResponseDto,
} from './dto/quest-session.dto';
import { randomBytes } from 'crypto';

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
    ) {}

    private generateInviteToken(): string {
        return randomBytes(16).toString('hex');
    }

    private isSessionActive(session: QuestSessionEntity): boolean {
        const now = new Date();

        if (session.endReason) {
            return false;
        }

        if (session.startDate > now) {
            return false;
        }

        if (session.endDate) {
            return session.endDate > now;
        }

        const questDurationMs = session.quest.maxDurationMinutes * 60 * 1000;
        const maxEndTime = new Date(session.startDate.getTime() + questDurationMs);

        return now < maxEndTime;
    }

    async create(questId: number, dto: QuestSessionDto, organizerId: number): Promise<QuestSessionResponseDto> {
        const quest = await this.questRepository.findOne({
            where: { questId },
            relations: ['organizer'],
        });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${questId} not found`);
        }

        if (quest.organizer.userId !== organizerId) {
            throw new ForbiddenException('Only the quest organizer can create sessions');
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

    async findById(id: number, userId?: number): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { questSessionId: id },
            relations: ['quest', 'quest.organizer', 'participants', 'participants.user'],
        });

        if (!session) {
            throw new NotFoundException(`Session with ID ${id} not found`);
        }

        if (userId) {
            const isOrganizer = session.quest.organizer.userId === userId;
            const isParticipant = session.participants.some(p => p.user.userId === userId);

            if (!isOrganizer && !isParticipant) {
                throw new ForbiddenException('You do not have access to this session');
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
            .orderBy('session.startDate', 'ASC')
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
            .leftJoinAndSelect('session.participants', 'participants')
            .where('participant.user.userId = :userId', { userId })
            .orderBy('session.startDate', 'ASC')
            .skip(offset)
            .take(limit);

        const [participants, total] = await qb.getManyAndCount();

        const items = participants.map(p => this.mapToListResponseDto(p.session));

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
            relations: ['quest', 'quest.organizer'],
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

        return this.findById(id);
    }

    async joinSession(dto: JoinSessionDto, userId: number): Promise<QuestSessionResponseDto> {
        const session = await this.sessionRepository.findOne({
            where: { inviteToken: dto.inviteToken },
            relations: ['participants', 'quest', 'quest.organizer'],
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

        const participant = this.participantRepository.create({
            session,
            user,
        });

        await this.participantRepository.save(participant);

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

        const participant = await this.participantRepository.findOne({
            where: {
                session: { questSessionId: sessionId },
                user: { userId },
            },
        });

        if (!participant) {
            throw new NotFoundException('Participant not found in this session');
        }

        await this.participantRepository.remove(participant);
    }

    private mapToResponseDto(session: QuestSessionEntity): QuestSessionResponseDto {
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
                joinedAt: p.createdAt,
            })),
            isActive: this.isSessionActive(session),
            participantCount: session.participants?.length || 0,
        };
    }

    private mapToListResponseDto(session: QuestSessionEntity): QuestSessionListResponseDto {
        return {
            questSessionId: session.questSessionId,
            questId: session.quest.questId,
            questTitle: session.quest.title,
            startDate: session.startDate,
            endDate: session.endDate,
            isActive: this.isSessionActive(session),
            participantCount: session.participants?.length || 0,
        };
    }
}