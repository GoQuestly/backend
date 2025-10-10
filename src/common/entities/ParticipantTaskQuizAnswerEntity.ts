import {Entity, PrimaryGeneratedColumn, ManyToOne, Column} from 'typeorm';
import { ParticipantTaskEntity } from './ParticipantTaskEntity';
import { QuizAnswerEntity } from './QuizAnswerEntity';

@Entity('participant_task_quiz_answers')
export class ParticipantTaskQuizAnswerEntity {
    @PrimaryGeneratedColumn({ name: "participant_task_quiz_answer_id" })
    participantTaskQuizAnswerId : number;

    @ManyToOne(() => ParticipantTaskEntity, (pt) => pt.quizAnswers)
    participantTask: ParticipantTaskEntity;

    @ManyToOne(() => QuizAnswerEntity)
    answer: QuizAnswerEntity;

    @Column({name: "answer_date" })
    answerDate: Date;
}
