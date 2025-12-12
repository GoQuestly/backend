import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFinishDateToParticipant1765012345678 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "participants"
            ADD COLUMN "finish_date" TIMESTAMP NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "participants"
            DROP COLUMN "finish_date"
        `);
    }

}
