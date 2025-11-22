import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { QuestEntity } from './quest.entity';
import { ParticipantEntity } from './participant.entity';
import { QuestSessionEndReason } from "@/common/enums/quest-session-end-reason";

@Entity('quest_sessions')
export class QuestSessionEntity {
    @PrimaryGeneratedColumn({ name: "quest_session_id" })
    questSessionId: number;

    @Column({ name: "start_date" })
    startDate: Date;

    @Column({ name: "end_date", nullable: true })
    endDate: Date;

    @Column({ name: "end_reason", nullable: true, enum: QuestSessionEndReason, type: "enum" })
    endReason: QuestSessionEndReason;

    @Column({ name: "invite_token", unique: true })
    inviteToken: string;

    @OneToMany(() => ParticipantEntity, (p) => p.session)
    participants: ParticipantEntity[];

    @ManyToOne(() => QuestEntity, (quest) => quest.sessions, { onDelete: 'CASCADE' })
    quest: QuestEntity;
}
