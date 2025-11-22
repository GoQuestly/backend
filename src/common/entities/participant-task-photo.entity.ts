import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn} from 'typeorm';
import { ParticipantTaskEntity } from './participant-task.entity';

@Entity('participant_task_photos')
export class ParticipantTaskPhotoEntity {
    @PrimaryGeneratedColumn({ name: "participant_task_photo_id" })
    participantTaskPhotoId: number;

    @Column({ name: "photo_url" })
    photoUrl: string;

    @Column({ name: "upload_date" })
    uploadDate: Date;

    @Column({ name: "is_approved" })
    isApproved: boolean;

    @OneToOne(() => ParticipantTaskEntity, (pt) => pt.photo)
    @JoinColumn({ name: "participant_task_id" })
    participantTask: ParticipantTaskEntity;
}
