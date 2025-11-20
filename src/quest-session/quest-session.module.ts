import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {JwtModule} from '@nestjs/jwt';
import {OrganizerSessionController} from './organizer-session.controller';
import {ParticipantSessionController} from './participant-session.controller';
import {LocationController} from './location.controller';
import {ParticipantTaskController} from './participant-task.controller'; // NEW
import {QuestSessionService} from './quest-session.service';
import {LocationService} from './location.service';
import {ParticipantTaskService} from './participant-task.service'; // NEW
import {ActiveSessionGateway} from './active-session.gateway';
import {SessionEventsGateway} from './session-events.gateway';
import {SessionEndValidatorService} from './session-end-validator.service';
import {QuestSessionEntity} from '@/common/entities/QuestSessionEntity';
import {ParticipantEntity} from '@/common/entities/ParticipantEntity';
import {ParticipantLocationEntity} from '@/common/entities/ParticipantLocationEntity';
import {ParticipantPointEntity} from '@/common/entities/ParticipantPointEntity'; // NEW
import {QuestEntity} from '@/common/entities/QuestEntity';
import {UserEntity} from '@/common/entities/UserEntity';
import {QuestPointEntity} from '@/common/entities/QuestPointEntity'; // NEW
import {QuestTaskEntity} from '@/common/entities/QuestTaskEntity'; // NEW
import {ParticipantTaskEntity} from '@/common/entities/ParticipantTaskEntity'; // NEW
import {QuizQuestionEntity} from '@/common/entities/QuizQuestionEntity';
import {QuizAnswerEntity} from '@/common/entities/QuizAnswerEntity';
import {ParticipantTaskQuizAnswerEntity} from '@/common/entities/ParticipantTaskQuizAnswerEntity';
import {ParticipantTaskPhotoEntity} from '@/common/entities/ParticipantTaskPhotoEntity';
import {EmailModule} from '@/email/email.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestSessionEntity,
            ParticipantEntity,
            ParticipantLocationEntity,
            ParticipantPointEntity,
            QuestEntity,
            UserEntity,
            QuestPointEntity,
            QuestTaskEntity,
            ParticipantTaskEntity,
            QuizQuestionEntity,
            QuizAnswerEntity,
            ParticipantTaskQuizAnswerEntity,
            ParticipantTaskPhotoEntity,
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
        ParticipantTaskController, // NEW
    ],
    providers: [
        QuestSessionService,
        LocationService,
        ParticipantTaskService, // NEW
        ActiveSessionGateway,
        SessionEventsGateway,
        SessionEndValidatorService,
    ],
    exports: [QuestSessionService, LocationService],
})
export class QuestSessionModule {}