import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { QuestEntity } from './QuestEntity';
import { ParticipantEntity } from './ParticipantEntity';
import { QuestSessionEndReason } from "@/common/enums/QuestSessionEndReason";

@Entity('quest_sessions')
export class QuestSessionEntity {
    @PrimaryGeneratedColumn({ name: "quest_session_id" })
    questSessionId: number;

    @ManyToOne(() => QuestEntity, (quest) => quest.sessions)
    quest: QuestEntity;

    @Column({ name: "start_date" })
    startDate: Date;

    @Column({ name: "end_date" })
    endDate: Date;

    @Column({ name: "end_reason", nullable: true, enum: QuestSessionEndReason, type: "enum" })
    endReason: QuestSessionEndReason;

    @Column({ name: "invite_token", unique: true })
    inviteToken: string;

    @OneToMany(() => ParticipantEntity, (p) => p.session)
    participants: ParticipantEntity[];
}
