import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { QuestEntity } from './quest.entity';
import { ParticipantEntity } from './participant.entity';

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

    @Column({ name: 'is_email_verified', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'email_verification_code', nullable: true, length: 6 })
    emailVerificationCode: string;

    @Column({ name: 'email_verification_code_expires', nullable: true, type: 'timestamp' })
    emailVerificationCodeExpires: Date;

    @Column({ name: 'email_verification_last_request', nullable: true, type: 'timestamp' })
    emailVerificationLastRequest: Date;

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