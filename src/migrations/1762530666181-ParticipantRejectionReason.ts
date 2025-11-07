import { MigrationInterface, QueryRunner } from "typeorm";

export class ParticipantRejectionReason1762530666181 implements MigrationInterface {
    name = 'ParticipantRejectionReason1762530666181'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`CREATE TYPE "public"."participants_rejection_reason_enum" AS ENUM('NO_LOCATION', 'LOCATION_TOO_OLD', 'TOO_FAR_FROM_START')`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "rejection_reason" "public"."participants_rejection_reason_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "rejection_reason"`);
        await queryRunner.query(`DROP TYPE "public"."participants_rejection_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "rejection_reason" character varying`);
    }

}
