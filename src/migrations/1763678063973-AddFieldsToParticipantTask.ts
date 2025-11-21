import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsToParticipantTask1763678063973 implements MigrationInterface {
    name = 'AddFieldsToParticipantTask1763678063973'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD "start_date" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD "code_word" character varying`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD "score_earned" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TYPE "public"."participants_rejection_reason_enum" RENAME TO "participants_rejection_reason_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."participants_rejection_reason_enum" AS ENUM('NO_LOCATION', 'TOO_FAR_FROM_START')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "rejection_reason" TYPE "public"."participants_rejection_reason_enum" USING "rejection_reason"::"text"::"public"."participants_rejection_reason_enum"`);
        await queryRunner.query(`DROP TYPE "public"."participants_rejection_reason_enum_old"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ALTER COLUMN "completed_date" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_tasks" ALTER COLUMN "completed_date" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."participants_rejection_reason_enum_old" AS ENUM('NO_LOCATION', 'LOCATION_TOO_OLD', 'TOO_FAR_FROM_START')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "rejection_reason" TYPE "public"."participants_rejection_reason_enum_old" USING "rejection_reason"::"text"::"public"."participants_rejection_reason_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."participants_rejection_reason_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."participants_rejection_reason_enum_old" RENAME TO "participants_rejection_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP COLUMN "score_earned"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP COLUMN "code_word"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP COLUMN "start_date"`);
    }

}
