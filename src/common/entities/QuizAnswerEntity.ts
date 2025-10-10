import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { QuizQuestionEntity } from './QuizQuestionEntity';

@Entity('quiz_answers')
export class QuizAnswerEntity {
    @PrimaryGeneratedColumn({ name: "quiz_answer_id" })
    quizAnswerId: number;

    @Column()
    answer: string;

    @Column({ default: false })
    isCorrect: boolean;

    @ManyToOne(() => QuizQuestionEntity, (q) => q.answers)
    question: QuizQuestionEntity;
}