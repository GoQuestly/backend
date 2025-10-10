import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne} from 'typeorm';
import { QuestEntity } from './QuestEntity';
import { QuestTaskEntity } from './QuestTaskEntity';
import {ParticipantPointEntity} from "@/common/entities/ParticipantPointEntity";

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

    @OneToOne(() => QuestTaskEntity, (task) => task.point)
    tasks: QuestTaskEntity[];

    @OneToMany(() => ParticipantPointEntity, (pp) => pp.point)
    participantPoints: ParticipantPointEntity[];
}
