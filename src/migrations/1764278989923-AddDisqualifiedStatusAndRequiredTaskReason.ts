import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDisqualifiedStatusAndRequiredTaskReason1764278989923 implements MigrationInterface {
    name = 'AddDisqualifiedStatusAndRequiredTaskReason1764278989923'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."participants_participation_status_enum" RENAME TO "participants_participation_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."participants_participation_status_enum" AS ENUM('pending', 'approved', 'rejected', 'disqualified')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" TYPE "public"."participants_participation_status_enum" USING "participation_status"::"text"::"public"."participants_participation_status_enum"`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."participants_participation_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."participants_participation_status_enum_old" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" TYPE "public"."participants_participation_status_enum_old" USING "participation_status"::"text"::"public"."participants_participation_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "participants" ALTER COLUMN "participation_status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."participants_participation_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."participants_participation_status_enum_old" RENAME TO "participants_participation_status_enum"`);
    }

}
