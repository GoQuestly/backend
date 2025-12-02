import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {JwtModule} from '@nestjs/jwt';
import {OrganizerSessionController} from './organizer-session.controller';
import {ParticipantSessionController} from './participant-session.controller';
import {LocationController} from './location.controller';
import {ParticipantTaskController} from './participant-task.controller';
import {QuestSessionService} from './quest-session.service';
import {LocationService} from './location.service';
import {ParticipantTaskService} from './participant-task.service';
import {ActiveSessionGateway} from './active-session.gateway';
import {SessionEventsGateway} from './session-events.gateway';
import {SessionEndValidatorService} from './session-end-validator.service';
import {TaskExpiryValidatorService} from './task-expiry-validator.service';
import {QuestSessionEntity} from '@/common/entities/quest-session.entity';
import {ParticipantEntity} from '@/common/entities/participant.entity';
import {ParticipantLocationEntity} from '@/common/entities/participant-location.entity';
import {ParticipantPointEntity} from '@/common/entities/participant-point.entity';
import {QuestEntity} from '@/common/entities/quest.entity';
import {UserEntity} from '@/common/entities/user.entity';
import {QuestPointEntity} from '@/common/entities/quest-point.entity';
import {QuestTaskEntity} from '@/common/entities/quest-task.entity';
import {ParticipantTaskEntity} from '@/common/entities/participant-task.entity';
import {QuizQuestionEntity} from '@/common/entities/quiz-question.entity';
import {QuizAnswerEntity} from '@/common/entities/quiz-answer.entity';
import {ParticipantTaskQuizAnswerEntity} from '@/common/entities/participant-task-quiz-answer.entity';
import {ParticipantTaskPhotoEntity} from '@/common/entities/participant-task-photo.entity';
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
        ParticipantTaskController,
    ],
    providers: [
        QuestSessionService,
        LocationService,
        ParticipantTaskService,
        ActiveSessionGateway,
        SessionEventsGateway,
        SessionEndValidatorService,
        TaskExpiryValidatorService,
    ],
    exports: [QuestSessionService, LocationService],
})
export class QuestSessionModule {}