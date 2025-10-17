import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
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

    @Column({ name: "photo_url", nullable: true })
    photoUrl: string;

    @Column({ name: 'reset_password_token', nullable: true, length: 500 })
    resetPasswordToken: string;

    @Column({ name: 'reset_password_expires', nullable: true, type: 'timestamp' })
    resetPasswordExpires: Date;

    @Column({ name: 'reset_password_last_request', nullable: true, type: 'timestamp' })
    resetPasswordLastRequest: Date;

    @OneToMany(() => QuestEntity, (quest) => quest.organizer)
    quests: QuestEntity[];

    @OneToMany(() => ParticipantEntity, (p) => p.user)
    participations: ParticipantEntity[];
}
