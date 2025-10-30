import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestTaskController } from './quest-task.controller';
import { QuestTaskService } from './quest-task.service';
import { QuestTaskEntity } from '@/common/entities/QuestTaskEntity';
import { QuizQuestionEntity } from '@/common/entities/QuizQuestionEntity';
import { QuizAnswerEntity } from '@/common/entities/QuizAnswerEntity';
import {QuestPointEntity} from "@/common/entities/QuestPointEntity";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            QuestTaskEntity,
            QuizQuestionEntity,
            QuizAnswerEntity,
            QuestPointEntity,
        ]),
    ],
    controllers: [QuestTaskController],
    providers: [QuestTaskService],
    exports: [QuestTaskService],
})
export class QuestTaskModule {}