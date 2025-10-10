import {Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, Column, OneToMany} from 'typeorm';
import { ParticipantEntity } from './ParticipantEntity';
import { QuestTaskEntity } from './QuestTaskEntity';
import { ParticipantTaskPhotoEntity } from './ParticipantTaskPhotoEntity';
import {ParticipantTaskQuizAnswerEntity} from "@/common/entities/ParticipantTaskQuizAnswerEntity";

@Entity('participant_tasks')
export class ParticipantTaskEntity {
    @PrimaryGeneratedColumn({ name: "participant_task_id"})
    participantTaskId: number;

    @ManyToOne(() => ParticipantEntity, (p) => p.tasks)
    participant: ParticipantEntity;

    @ManyToOne(() => QuestTaskEntity, (t) => t.participantTasks)
    task: QuestTaskEntity;

    @OneToOne(() => ParticipantTaskPhotoEntity, (photo) => photo.participantTask)
    photos: ParticipantTaskPhotoEntity[];

    @OneToMany(() => ParticipantTaskQuizAnswerEntity, (a) => a.participantTask)
    quizAnswers: ParticipantTaskQuizAnswerEntity[];

    @Column({ name: "completed_date"})
    completedDate: Date;
}
