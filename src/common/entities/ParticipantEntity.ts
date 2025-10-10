import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserEntity } from './UserEntity';
import { QuestSessionEntity } from './QuestSessionEntity';
import { ParticipantLocationEntity } from './ParticipantLocationEntity';
import { ParticipantTaskEntity } from './ParticipantTaskEntity';
import { ParticipantPointEntity } from './ParticipantPointEntity';

@Entity('participants')
export class ParticipantEntity {
    @PrimaryGeneratedColumn({ name: "participant_id" })
    participantId: number;

    @ManyToOne(() => UserEntity, (user) => user.participations)
    user: UserEntity;

    @ManyToOne(() => QuestSessionEntity, (session) => session.participants)
    session: QuestSessionEntity;

    @OneToMany(() => ParticipantLocationEntity, (loc) => loc.participant)
    locations: ParticipantLocationEntity[];

    @OneToMany(() => ParticipantTaskEntity, (pt) => pt.participant)
    tasks: ParticipantTaskEntity[];

    @OneToMany(() => ParticipantPointEntity, (pp) => pp.participant)
    points: ParticipantPointEntity[];
}
