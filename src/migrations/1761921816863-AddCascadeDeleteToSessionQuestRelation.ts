import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToSessionQuestRelation1761921816863 implements MigrationInterface {
    name = 'AddCascadeDeleteToSessionQuestRelation1761921816863'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quest_sessions" DROP CONSTRAINT "FK_490c5cea8927e1d7878a699d926"`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ADD CONSTRAINT "FK_490c5cea8927e1d7878a699d926" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quest_sessions" DROP CONSTRAINT "FK_490c5cea8927e1d7878a699d926"`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ADD CONSTRAINT "FK_490c5cea8927e1d7878a699d926" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
