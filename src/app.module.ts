import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { typeOrmConfig } from './common/typeorm.config';
import { AdminEntity } from "./common/entities/AdminEntity";
import { ParticipantEntity } from "./common/entities/ParticipantEntity";
import { ParticipantLocationEntity } from "./common/entities/ParticipantLocationEntity";
import { ParticipantPointEntity } from "./common/entities/ParticipantPointEntity";
import { ParticipantTaskEntity } from "./common/entities/ParticipantTaskEntity";
import { ParticipantTaskPhotoEntity } from "./common/entities/ParticipantTaskPhotoEntity";
import { ParticipantTaskQuizAnswerEntity } from "./common/entities/ParticipantTaskQuizAnswerEntity";
import { QuestEntity } from "./common/entities/QuestEntity";
import { QuestPointEntity } from "./common/entities/QuestPointEntity";
import { QuestSessionEntity } from "./common/entities/QuestSessionEntity";
import { QuestTaskEntity } from "./common/entities/QuestTaskEntity";
import { QuizAnswerEntity } from "./common/entities/QuizAnswerEntity";
import { QuizQuestionEntity } from "./common/entities/QuizQuestionEntity";
import { UserEntity } from "./common/entities/UserEntity";
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from "@/email/email.module";
import { QuestModule } from './quest/quest.module';
import { QuestPointModule } from "@/quest-point/quest-point.module";
import { QuestTaskModule } from "@/quest-task/quest-task.module";
import { QuestSessionModule } from "@/quest-session/quest-session.module";

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
})

export class AppModule {}