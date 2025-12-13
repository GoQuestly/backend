import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { ParticipantEntity } from './participant.entity';
import { QuestPointEntity } from './quest-point.entity';

@Entity('participant_points')
@Unique(['participant', 'point'])
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
