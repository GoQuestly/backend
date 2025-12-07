import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePhotoApprovalNullable1763888512000 implements MigrationInterface {
    name = 'MakePhotoApprovalNullable1763888512000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='participant_task_photos' 
                      AND column_name='is_approved'
                ) THEN
                    ALTER TABLE participant_task_photos 
                    ALTER COLUMN is_approved DROP NOT NULL;
                END IF;
            END$$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='participant_task_photos' 
                      AND column_name='is_approved'
                ) THEN
                    ALTER TABLE participant_task_photos 
                    ALTER COLUMN is_approved SET NOT NULL;
                END IF;
            END$$;
        `);
    }
}
