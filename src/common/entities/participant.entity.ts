import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { QuestSessionEntity } from './quest-session.entity';
import { ParticipantLocationEntity } from './participant-location.entity';
import { ParticipantTaskEntity } from './participant-task.entity';
import { ParticipantPointEntity } from './participant-point.entity';
import { ParticipantStatus } from '@/common/enums/participant-status';
import { RejectionReason } from '@/common/enums/rejection-reason';

@Entity('participants')
export class ParticipantEntity {
    @PrimaryGeneratedColumn({ name: "participant_id" })
    participantId: number;

    @ManyToOne(() => UserEntity, (user) => user.participations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_user_id' })
    user: UserEntity;

    @ManyToOne(() => QuestSessionEntity, (session) => session.participants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'session_quest_session_id' })
    session: QuestSessionEntity;

    @OneToMany(() => ParticipantLocationEntity, (loc) => loc.participant, { cascade: true })
    locations: ParticipantLocationEntity[];

    @OneToMany(() => ParticipantTaskEntity, (pt) => pt.participant, { cascade: true })
    tasks: ParticipantTaskEntity[];

    @OneToMany(() => ParticipantPointEntity, (pp) => pp.participant, { cascade: true })
    points: ParticipantPointEntity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({
        name: 'participation_status',
        type: 'enum',
        enum: ParticipantStatus,
        default: ParticipantStatus.PENDING
    })
    participationStatus: ParticipantStatus;

    @Column({
        name: 'rejection_reason',
        type: 'enum',
        enum: RejectionReason,
        nullable: true
    })
    rejectionReason: RejectionReason;

    @Column({ name: 'finish_date', nullable: true })
    finishDate: Date;
}