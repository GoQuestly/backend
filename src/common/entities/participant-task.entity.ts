import {Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, Column, OneToMany} from 'typeorm';
import { ParticipantEntity } from './participant.entity';
import { QuestTaskEntity } from './quest-task.entity';
import { ParticipantTaskPhotoEntity } from './participant-task-photo.entity';
import {ParticipantTaskQuizAnswerEntity} from "@/common/entities/participant-task-quiz-answer.entity";

@Entity('participant_tasks')
export class ParticipantTaskEntity {
    @PrimaryGeneratedColumn({ name: "participant_task_id"})
    participantTaskId: number;

    @ManyToOne(() => ParticipantEntity, (p) => p.tasks)
    participant: ParticipantEntity;

    @ManyToOne(() => QuestTaskEntity, (t) => t.participantTasks)
    task: QuestTaskEntity;

    @OneToOne(() => ParticipantTaskPhotoEntity, (photo) => photo.participantTask)
    photo: ParticipantTaskPhotoEntity;

    @OneToMany(() => ParticipantTaskQuizAnswerEntity, (a) => a.participantTask)
    quizAnswers: ParticipantTaskQuizAnswerEntity[];

    @Column({ name: "start_date", nullable: true })
    startDate: Date;

    @Column({ name: "completed_date", nullable: true })
    completedDate: Date;

    @Column({ name: "code_word", nullable: true })
    codeWord: string;

    @Column({ name: "score_earned", default: 0 })
    scoreEarned: number;
}
