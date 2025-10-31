import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToQuizQuestion1761760197152 implements MigrationInterface {
    name = 'AddCascadeDeleteToQuizQuestion1761760197152'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92"`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" ADD CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92"`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" ADD CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
