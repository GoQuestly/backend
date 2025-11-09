import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedAtToParticipant1761910514307 implements MigrationInterface {
    name = 'AddCreatedAtToParticipant1761910514307'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_77bea66b0124d5c5c20ca412c04"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_936260519a2d07bceffd4a57d89"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "userUserId"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "sessionQuestSessionId"`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "user_user_id" integer`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "session_quest_session_id" integer`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_cfdb11b71d3847dbfb0647d7f3a" FOREIGN KEY ("user_user_id") REFERENCES "user"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_8b289134441e6f3d48c92626fa7" FOREIGN KEY ("session_quest_session_id") REFERENCES "quest_sessions"("quest_session_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_8b289134441e6f3d48c92626fa7"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_cfdb11b71d3847dbfb0647d7f3a"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "session_quest_session_id"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "user_user_id"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "sessionQuestSessionId" integer`);
        await queryRunner.query(`ALTER TABLE "participants" ADD "userUserId" integer`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_936260519a2d07bceffd4a57d89" FOREIGN KEY ("sessionQuestSessionId") REFERENCES "quest_sessions"("quest_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_77bea66b0124d5c5c20ca412c04" FOREIGN KEY ("userUserId") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
