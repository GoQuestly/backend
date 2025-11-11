import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { LocationService } from './location.service';

@Injectable()
export class SessionEndValidatorService {
    private readonly logger = new Logger(SessionEndValidatorService.name);

    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        private locationService: LocationService,
    ) {
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async validateSessionEnds() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

        try {
            const sessions = await this.sessionRepository
                .createQueryBuilder('session')
                .leftJoinAndSelect('session.quest', 'quest')
                .leftJoinAndSelect('session.participants', 'participants')
                .where('session.endReason IS NULL')
                .andWhere(
                    '(session.endDate BETWEEN :oneMinuteAgo AND :now) OR ' +
                    "(session.endDate IS NULL AND " +
                    "session.startDate + (quest.maxDurationMinutes * interval '1 minute') BETWEEN :oneMinuteAgo AND :now)",
                    {oneMinuteAgo, now}
                )
                .getMany();

            if (sessions.length === 0) {
                return;
            }

            this.logger.log(`Found ${sessions.length} sessions that just ended`);

            for (const session of sessions) {
                this.logger.log(`Processing session ${session.questSessionId} for end validation`);

                try {
                    await this.locationService.rejectParticipantsWithoutLocation(
                        session.questSessionId
                    );
                } catch (error) {
                    this.logger.error(
                        `Failed to validate participants for ended session ${session.questSessionId}: ${error.message}`,
                        error.stack
                    );
                }
            }
        } catch (error) {
            this.logger.error(
                `Error in validateSessionEnds: ${error.message}`,
                error.stack
            );
        }
    }
}
