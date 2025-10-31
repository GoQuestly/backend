import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { QuestSessionEntity } from './QuestSessionEntity';
import { ParticipantLocationEntity } from './ParticipantLocationEntity';
import { ParticipantTaskEntity } from './ParticipantTaskEntity';
import { ParticipantPointEntity } from './ParticipantPointEntity';

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

    @OneToMany(() => ParticipantLocationEntity, (loc) => loc.participant)
    locations: ParticipantLocationEntity[];

    @OneToMany(() => ParticipantTaskEntity, (pt) => pt.participant)
    tasks: ParticipantTaskEntity[];

    @OneToMany(() => ParticipantPointEntity, (pp) => pp.participant)
    points: ParticipantPointEntity[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}