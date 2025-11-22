import {Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne} from 'typeorm';
import { QuestPointEntity } from './quest-point.entity';
import { QuizQuestionEntity } from './quiz-question.entity';
import { ParticipantTaskEntity } from './participant-task.entity';
import { QuestTaskType } from "@/common/enums/quest-task-type";

@Entity('quest_tasks')
export class QuestTaskEntity {
    @PrimaryGeneratedColumn({ name: "quest_task_id" })
    questTaskId: number;

    @Column({ name: "task_type", enum: QuestTaskType, type: "enum" })
    taskType: QuestTaskType;

    @Column({ name: "max_score_points_count" })
    maxScorePointsCount: number;

    @Column({ name: "code_word" })
    codeWord: string;

    @Column('text', { nullable: true })
    description: string;

    @Column({ name: "max_duration_seconds" })
    maxDurationSeconds: number

    @Column({ name: "success_score_points_percent" })
    successScorePointsPercent: number;

    @Column({ name: "is_required_for_next_point"})
    isRequiredForNextPoint: boolean;

    @OneToOne(() => QuestPointEntity, (p) => p.task)
    point: QuestPointEntity;

    @OneToMany(() => QuizQuestionEntity, (q) => q.task)
    quizQuestions: QuizQuestionEntity[];

    @OneToMany(() => ParticipantTaskEntity, (pt) => pt.task)
    participantTasks: ParticipantTaskEntity[];
}
