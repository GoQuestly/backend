import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OrganizerSessionController } from './organizer-session.controller';
import { ParticipantSessionController } from './participant-session.controller';
import { LocationController } from './location.controller';
import { QuestSessionService } from './quest-session.service';
import { LocationService } from './location.service';
import { LocationGateway } from './location.gateway';
import { SessionEndValidatorService } from './session-end-validator.service';
import { QuestSessionEntity } from '@/common/entities/QuestSessionEntity';
import { ParticipantEntity } from '@/common/entities/ParticipantEntity';
import { ParticipantLocationEntity } from '@/common/entities/ParticipantLocationEntity';
import { QuestEntity } from '@/common/entities/QuestEntity';
import { UserEntity } from '@/common/entities/UserEntity';
import { EmailModule } from '@/email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestSessionEntity,
            ParticipantEntity,
            ParticipantLocationEntity,
            QuestEntity,
            UserEntity,
        ]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
        }),
        EmailModule,
    ],
    controllers: [
        OrganizerSessionController,
        ParticipantSessionController,
        LocationController,
    ],
    providers: [
        QuestSessionService,
        LocationService,
        LocationGateway,
        SessionEndValidatorService,
    ],
    exports: [QuestSessionService, LocationService],
})
export class QuestSessionModule {}