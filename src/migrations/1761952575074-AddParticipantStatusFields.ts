import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParticipantStatusFields1761952575074 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "participant_status_enum" AS ENUM ('pending', 'approved', 'rejected')
        `);

        await queryRunner.query(`
            ALTER TABLE "participants"
            ADD COLUMN "participation_status" "participant_status_enum" NOT NULL DEFAULT 'pending'
        `);

        await queryRunner.query(`
            ALTER TABLE "participants"
            ADD COLUMN "rejection_reason" VARCHAR NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "participants"
            ADD COLUMN "status_checked_at" TIMESTAMP NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "participants"
            DROP COLUMN "status_checked_at"
        `);

        await queryRunner.query(`
            ALTER TABLE "participants"
            DROP COLUMN "rejection_reason"
        `);

        await queryRunner.query(`
            ALTER TABLE "participants"
            DROP COLUMN "participation_status"
        `);

        await queryRunner.query(`
            DROP TYPE "participant_status_enum"
        `);
    }

}
