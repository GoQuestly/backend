import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
                UserEntity
            ]
        }),
        UserModule,
    ],
})

export class AppModule {}