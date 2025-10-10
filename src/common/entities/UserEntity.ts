import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { QuestEntity } from './QuestEntity';
import { ParticipantEntity } from './ParticipantEntity';

@Entity('user')
export class UserEntity {
    @PrimaryGeneratedColumn({ name: 'user_id' })
    userId: number;

    @Column({ name: 'name', length: 100 })
    name: string;

    @Column({ name: 'email', length: 100 })
    email: string;

    @Column({ name: 'password', length: 255 })
    password: string;

    @Column({ name: "photo_url"})
    photoUrl: string;

    @OneToMany(() => QuestEntity, (quest) => quest.organizer)
    quests: QuestEntity[];

    @OneToMany(() => ParticipantEntity, (p) => p.user)
    participations: ParticipantEntity[];
}
