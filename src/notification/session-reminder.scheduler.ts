import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/quest-session.entity';
import { ParticipantEntity } from '@/common/entities/participant.entity';
import { ParticipantStatus } from '@/common/enums/participant-status';
import { NotificationService } from './notification.service';

const EARLY_REMINDER_MINUTES = 10;
const EARLY_REMINDER_MS = EARLY_REMINDER_MINUTES * 60 * 1000;
const START_REMINDER_BUFFER_SECONDS = 30;
const START_REMINDER_BUFFER_MS = START_REMINDER_BUFFER_SECONDS * 1000;

@Injectable()
export class SessionReminderScheduler {
    private readonly logger = new Logger(SessionReminderScheduler.name);
    private sentReminders = new Set<string>();

    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        @InjectRepository(ParticipantEntity)
        private participantRepository: Repository<ParticipantEntity>,
        private notificationService: NotificationService,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async checkSessionReminders() {
        const now = new Date();
        const earlyReminderTime = new Date(now.getTime() + EARLY_REMINDER_MS);
        const startReminderBufferTime = new Date(now.getTime() + START_REMINDER_BUFFER_MS);

        try {
            await this.handleEarlyReminders(now, earlyReminderTime);

            await this.handleStartReminders(now, startReminderBufferTime);
        } catch (error) {
            this.logger.error(
                `Error in checkSessionReminders: ${error.message}`,
                error.stack
            );
        }
    }

    private async handleEarlyReminders(now: Date, earlyReminderTime: Date) {
        const upcomingSessions = await this.sessionRepository.find({
            where: {
                startDate: Between(now, earlyReminderTime),
                endReason: IsNull(),
            },
            relations: ['quest', 'participants', 'participants.user'],
        });

        for (const session of upcomingSessions) {
            const key = `early_${session.questSessionId}`;

            if (this.sentReminders.has(key)) {
                continue;
            }

            const earlyReminderCutoff = new Date(session.startDate.getTime() - EARLY_REMINDER_MS);

            const eligibleParticipants = session.participants.filter(
                p => p.createdAt <= earlyReminderCutoff
            );

            const skippedCount = session.participants.length - eligibleParticipants.length;
            if (skippedCount > 0) {
                this.logger.log(
                    `Skipping ${skippedCount} participants who joined less than ${EARLY_REMINDER_MINUTES} minutes before start`
                );
            }

            this.logger.log(
                `Sending ${EARLY_REMINDER_MINUTES}-minute reminders for session ${session.questSessionId} to ${eligibleParticipants.length} participants`
            );

            if (eligibleParticipants.length > 0) {
                const participantEntities = await this.participantRepository.find({
                    where: eligibleParticipants.map(p => ({ participantId: p.participantId })),
                    relations: ['user'],
                });

                await this.notificationService.sendSessionStartReminderEarlyToMultiple(
                    participantEntities,
                    session.questSessionId,
                    session.quest.title
                );
            }

            this.sentReminders.add(key);
        }
    }

    private async handleStartReminders(now: Date, startReminderBufferTime: Date) {
        const startingSessions = await this.sessionRepository.find({
            where: {
                startDate: Between(now, startReminderBufferTime),
                endReason: IsNull(),
            },
            relations: ['quest', 'participants', 'participants.user'],
        });

        for (const session of startingSessions) {
            const key = `start_${session.questSessionId}`;

            if (this.sentReminders.has(key)) {
                continue;
            }

            this.logger.log(
                `Sending start notifications for session ${session.questSessionId} to ${session.participants.length} participants`
            );

            if (session.participants.length > 0) {
                const participantEntities = await this.participantRepository.find({
                    where: session.participants.map(p => ({ participantId: p.participantId })),
                    relations: ['user'],
                });

                await this.notificationService.sendSessionStartReminderToMultiple(
                    participantEntities,
                    session.questSessionId,
                    session.quest.title
                );
            }

            this.sentReminders.add(key);
        }
    }

    @Cron('0 0 * * *')
    async cleanupSentReminders() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const oldSessions = await this.sessionRepository.find({
            where: {
                startDate: Between(new Date(0), yesterday),
            },
            select: ['questSessionId'],
        });

        const oldSessionIds = new Set(oldSessions.map(s => s.questSessionId));

        this.sentReminders.forEach(key => {
            const sessionId = parseInt(key.split('_')[1]);
            if (oldSessionIds.has(sessionId)) {
                this.sentReminders.delete(key);
            }
        });

        this.logger.log(`Cleaned up ${oldSessionIds.size} old session reminders`);
    }
}