import { MigrationInterface, QueryRunner } from "typeorm";

export class DisqualifiedStatus1764940669234 implements MigrationInterface {
    name = 'DisqualifiedStatus1764940669234'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."participants_rejection_reason_enum" RENAME TO "participants_rejection_reason_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."participants_rejection_reason_enum" AS ENUM('NO_LOCATION', 'TOO_FAR_FROM_START', 'REQUIRED_TASK_NOT_COMPLETED')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "rejection_reason" TYPE "public"."participants_rejection_reason_enum" USING "rejection_reason"::"text"::"public"."participants_rejection_reason_enum"`);
        await queryRunner.query(`DROP TYPE "public"."participants_rejection_reason_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."participants_rejection_reason_enum_old" AS ENUM('NO_LOCATION', 'TOO_FAR_FROM_START')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "rejection_reason" TYPE "public"."participants_rejection_reason_enum_old" USING "rejection_reason"::"text"::"public"."participants_rejection_reason_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."participants_rejection_reason_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."participants_rejection_reason_enum_old" RENAME TO "participants_rejection_reason_enum"`);
    }

}
