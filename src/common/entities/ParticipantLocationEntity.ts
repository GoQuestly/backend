import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ParticipantEntity } from './ParticipantEntity';

@Entity('participant_locations')
export class ParticipantLocationEntity {
    @PrimaryGeneratedColumn({ name: "participant_location_id" })
    participantLocationId: number;

    @Column('float')
    latitude: number;

    @Column('float')
    longitude: number;

    @Column()
    timestamp: Date;

    @ManyToOne(() => ParticipantEntity, (p) => p.locations)
    participant: ParticipantEntity;
}
