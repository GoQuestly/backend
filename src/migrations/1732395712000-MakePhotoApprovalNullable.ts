import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePhotoApprovalNullable1732395712000 implements MigrationInterface {
    name = 'MakePhotoApprovalNullable1732395712000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ALTER COLUMN "is_approved" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ALTER COLUMN "is_approved" SET NOT NULL`);
    }

}