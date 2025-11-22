import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn} from 'typeorm';
import { QuestEntity } from './quest.entity';
import { QuestTaskEntity } from './quest-task.entity';
import {ParticipantPointEntity} from "@/common/entities/participant-point.entity";

@Entity('quest_points')
export class QuestPointEntity {
    @PrimaryGeneratedColumn({ name: "quest_point_id" })
    questPointId: number;

    @Column()
    name: string;

    @Column('float')
    latitude: number;

    @Column('float')
    longitude: number;

    @Column({ name: "order_num" })
    orderNum: number;

    @ManyToOne(() => QuestEntity, (quest) => quest.points)
    quest: QuestEntity;

    @Column({ name: "quest_task_id", unique: true, nullable: true })
    questTaskId: number;

    @OneToOne(() => QuestTaskEntity, (task) => task.point, {
        cascade: true,
        onDelete: 'SET NULL'
    })
    @JoinColumn({ name: "quest_task_id" })
    task: QuestTaskEntity;

    @OneToMany(() => ParticipantPointEntity, (pp) => pp.point)
    participantPoints: ParticipantPointEntity[];
}