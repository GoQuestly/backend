import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerSessionController } from './organizer-session.controller';
import { ParticipantSessionController } from './participant-session.controller';
import { QuestSessionService } from './quest-session.service';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { QuestEntity } from '@/common/entities/QuestEntity';
import { UserEntity } from '@/common/entities/UserEntity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestSessionEntity,
            ParticipantEntity,
            QuestEntity,
            UserEntity,
        ]),
    ],
    controllers: [
        OrganizerSessionController,
        ParticipantSessionController,
    ],
    providers: [QuestSessionService],
    exports: [QuestSessionService],
})
export class QuestSessionModule {}