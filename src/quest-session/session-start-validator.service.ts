import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantStatus } from '@/common/enums/ParticipantStatus';
import { LocationService } from './location.service';

@Injectable()
export class SessionStartValidatorService {
    private readonly logger = new Logger(SessionStartValidatorService.name);

    constructor(
        @InjectRepository(QuestSessionEntity)
        private sessionRepository: Repository<QuestSessionEntity>,
        private locationService: LocationService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async validateSessionStarts() {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);

        try {
            const startedSessions = await this.sessionRepository.find({
                where: {
                    startDate: Between(oneMinuteAgo, now),
                    endReason: null,
                },
                relations: ['quest', 'participants'],
            });

            if (startedSessions.length === 0) {
                return;
            }

            this.logger.log(`Found ${startedSessions.length} sessions that just started`);

            for (const session of startedSessions) {
                const hasPendingParticipants = session.participants.some(
                    p => p.participationStatus === ParticipantStatus.PENDING
                );

                if (!hasPendingParticipants) {
                    this.logger.log(`Session ${session.questSessionId}: All participants already validated`);
                    continue;
                }

                this.logger.log(`Validating participants for session ${session.questSessionId}`);

                try {
                    const result = await this.locationService.validateStartPositions(
                        session.questSessionId
                    );

                    this.logger.log(
                        `Session ${session.questSessionId}: ${result.approved} approved, ${result.rejected} rejected`
                    );

                    if (result.rejected > 0) {
                        this.logger.warn(
                            `Session ${session.questSessionId}: Rejected participants: ` +
                            result.details
                                .filter(d => d.status === ParticipantStatus.REJECTED)
                                .map(d => `${d.userName} (${d.reason})`)
                                .join(', ')
                        );
                    }
                } catch (error) {
                    this.logger.error(
                        `Failed to validate participants for session ${session.questSessionId}: ${error.message}`,
                        error.stack
                    );
                }
            }
        } catch (error) {
            this.logger.error(
                `Error in validateSessionStarts: ${error.message}`,
                error.stack
            );
        }
    }
}
