import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToQuizAnswer1761759926902 implements MigrationInterface {
    name = 'AddCascadeDeleteToQuizAnswer1761759926902'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_answers" DROP CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255"`);
        await queryRunner.query(`ALTER TABLE "quiz_answers" ADD CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255" FOREIGN KEY ("questionQuizQuestionId") REFERENCES "quiz_questions"("quiz_question_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quiz_answers" DROP CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255"`);
        await queryRunner.query(`ALTER TABLE "quiz_answers" ADD CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255" FOREIGN KEY ("questionQuizQuestionId") REFERENCES "quiz_questions"("quiz_question_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
