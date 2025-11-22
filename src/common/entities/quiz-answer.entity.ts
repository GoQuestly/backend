import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { QuizQuestionEntity } from './quiz-question.entity';

@Entity('quiz_answers')
export class QuizAnswerEntity {
    @PrimaryGeneratedColumn({ name: "quiz_answer_id" })
    quizAnswerId: number;

    @Column()
    answer: string;

    @Column({ default: false })
    isCorrect: boolean;

    @ManyToOne(() => QuizQuestionEntity, (q) => q.answers, { onDelete: 'CASCADE' })
    question: QuizQuestionEntity;
}