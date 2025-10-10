import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admins')
export class AdminEntity {
    @PrimaryGeneratedColumn({ name: "admin_id" })
    adminId: number;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;
}