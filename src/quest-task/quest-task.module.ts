import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestTaskController } from './quest-task.controller';
import { QuestTaskService } from './quest-task.service';
import { QuestTaskEntity } from '@/common/entities/quest-task.entity';
import { QuizQuestionEntity } from '@/common/entities/quiz-question.entity';
import { QuizAnswerEntity } from '@/common/entities/quiz-answer.entity';
import {QuestPointEntity} from "@/common/entities/quest-point.entity";

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