import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeEndDateNullable1761918198589 implements MigrationInterface {
    name = 'MakeEndDateNullable1761918198589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quest_sessions" ALTER COLUMN "end_date" DROP NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."quest_sessions_end_reason_enum" RENAME TO "quest_sessions_end_reason_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."quest_sessions_end_reason_enum" AS ENUM('finished', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ALTER COLUMN "end_reason" TYPE "public"."quest_sessions_end_reason_enum" USING "end_reason"::"text"::"public"."quest_sessions_end_reason_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quest_sessions_end_reason_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."quest_sessions_end_reason_enum_old" AS ENUM('finished', 'terminated_by_organizer', 'terminated_by_participant')`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ALTER COLUMN "end_reason" TYPE "public"."quest_sessions_end_reason_enum_old" USING "end_reason"::"text"::"public"."quest_sessions_end_reason_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."quest_sessions_end_reason_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."quest_sessions_end_reason_enum_old" RENAME TO "quest_sessions_end_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ALTER COLUMN "end_date" SET NOT NULL`);
    }

}
