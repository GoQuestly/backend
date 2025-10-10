import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn
} from 'typeorm';
import { QuestPointEntity } from './QuestPointEntity';
import { QuestSessionEntity } from './QuestSessionEntity';
import { UserEntity } from './UserEntity';

@Entity('quests')
export class QuestEntity {
    @PrimaryGeneratedColumn({ name: "quest_id" })
    questId: number;

    @Column()
    title: string;

    @Column()
    description: string;

    @CreateDateColumn({ name: "creation_date" })
    creationDate: Date;

    @UpdateDateColumn({ name: "update_date" })
    updateDate: Date;

    @Column({ name: "starting_latitude", type: 'float' })
    startingLatitude: number;

    @Column({ name: "starting_longitude", type: 'float'})
    startingLongitude: number;

    @Column({ name: "starting_radius_meters" })
    startingRadiusMeters: number;

    @Column({ name: "max_duration_minutes" })
    maxDurationMinutes: number;

    @Column({ name: "photo_url" })
    photoUrl: string;

    @Column({ name: "min_participant_count" })
    minParticipantCount: number;

    @Column({ name: "max_participant_count" })
    maxParticipantCount: number;

    @ManyToOne(() => UserEntity, (user) => user.quests)
    organizer: UserEntity;

    @OneToMany(() => QuestPointEntity, (p) => p.quest)
    points: QuestPointEntity[];

    @OneToMany(() => QuestSessionEntity, (s) => s.quest)
    sessions: QuestSessionEntity[];
}
