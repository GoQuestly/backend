import {Entity, PrimaryGeneratedColumn, ManyToOne, Column} from 'typeorm';
import { ParticipantTaskEntity } from './participant-task.entity';
import { QuizAnswerEntity } from './quiz-answer.entity';

@Entity('participant_task_quiz_answers')
export class ParticipantTaskQuizAnswerEntity {
    @PrimaryGeneratedColumn({ name: "participant_task_quiz_answer_id" })
    participantTaskQuizAnswerId : number;

    @ManyToOne(() => ParticipantTaskEntity, (pt) => pt.quizAnswers)
    participantTask: ParticipantTaskEntity;

    @ManyToOne(() => QuizAnswerEntity, { onDelete: 'CASCADE' })
    answer: QuizAnswerEntity;

    @Column({name: "answer_date" })
    answerDate: Date;
}
