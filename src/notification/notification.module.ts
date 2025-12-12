import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FcmService } from './fcm.service';
import { NotificationService } from './notification.service';
import { SessionReminderScheduler } from './session-reminder.scheduler';
import { UserEntity } from '@/common/entities/user.entity';
import { QuestSessionEntity } from '@/common/entities/quest-session.entity';
import { ParticipantEntity } from '@/common/entities/participant.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            UserEntity,
            QuestSessionEntity,
            ParticipantEntity,
        ]),
    ],
    providers: [FcmService, NotificationService, SessionReminderScheduler],
    exports: [FcmService, NotificationService],
})
export class NotificationModule {}