import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { typeOrmConfig } from './common/typeorm.config';
import { AdminEntity } from "./common/entities/admin.entity";
import { ParticipantEntity } from "./common/entities/participant.entity";
import { ParticipantLocationEntity } from "./common/entities/participant-location.entity";
import { ParticipantPointEntity } from "./common/entities/participant-point.entity";
import { ParticipantTaskEntity } from "./common/entities/participant-task.entity";
import { ParticipantTaskPhotoEntity } from "./common/entities/participant-task-photo.entity";
import { ParticipantTaskQuizAnswerEntity } from "./common/entities/participant-task-quiz-answer.entity";
import { QuestEntity } from "./common/entities/quest.entity";
import { QuestPointEntity } from "./common/entities/quest-point.entity";
import { QuestSessionEntity } from "./common/entities/quest-session.entity";
import { QuestTaskEntity } from "./common/entities/quest-task.entity";
import { QuizAnswerEntity } from "./common/entities/quiz-answer.entity";
import { QuizQuestionEntity } from "./common/entities/quiz-question.entity";
import { UserEntity } from "./common/entities/user.entity";
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from "@/email/email.module";
import { QuestModule } from './quest/quest.module';
import { QuestPointModule } from "@/quest-point/quest-point.module";
import { QuestTaskModule } from "@/quest-task/quest-task.module";
import { QuestSessionModule } from "@/quest-session/quest-session.module";
import { ServerTimeController } from "@/common/server-time.controller";

@Module({
    imports: [
        TypeOrmModule.forRoot({
            ...typeOrmConfig,
            entities: [
                AdminEntity,
                ParticipantEntity,
                ParticipantLocationEntity,
                ParticipantPointEntity,
                ParticipantTaskEntity,
                ParticipantTaskPhotoEntity,
                ParticipantTaskQuizAnswerEntity,
                QuestEntity,
                QuestPointEntity,
                QuestSessionEntity,
                QuestTaskEntity,
                QuizAnswerEntity,
                QuizQuestionEntity,
                UserEntity,
            ]
        }),
        ScheduleModule.forRoot(),
        UserModule,
        AuthModule,
        EmailModule,
        UserModule,
        QuestModule,
        QuestPointModule,
        QuestTaskModule,
        QuestSessionModule,
    ],
    controllers: [ServerTimeController],
})

export class AppModule {}