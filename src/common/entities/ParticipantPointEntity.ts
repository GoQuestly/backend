import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ParticipantEntity } from './ParticipantEntity';
import { QuestPointEntity } from './QuestPointEntity';

@Entity('participant_points')
export class ParticipantPointEntity {
    @PrimaryGeneratedColumn({ name: "participant_point_id"})
    participantPointId: number;

    @ManyToOne(() => ParticipantEntity, (p) => p.points)
    participant: ParticipantEntity;

    @ManyToOne(() => QuestPointEntity, (p => p.participantPoints))
    point: QuestPointEntity;

    @Column({ name: "passed_date" })
    passedDate: Date;
}
