import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { QuestTaskEntity } from './QuestTaskEntity';
import { QuizAnswerEntity } from './QuizAnswerEntity';

@Entity('quiz_questions')
export class QuizQuestionEntity {
    @PrimaryGeneratedColumn({ name: "quiz_question_id" })
    quizQuestionId: number;

    @Column()
    question: string;

    @Column({ name: "order_number"})
    orderNumber: number;

    @Column({ name: "score_points_count" })
    scorePointsCount: number;

    @ManyToOne(() => QuestTaskEntity, (task) => task.quizQuestions, { onDelete: 'CASCADE' })
    task: QuestTaskEntity;

    @OneToMany(() => QuizAnswerEntity, (a) => a.question)
    answers: QuizAnswerEntity[];
}
