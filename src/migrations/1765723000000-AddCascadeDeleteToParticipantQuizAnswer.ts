import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToParticipantQuizAnswer1765723000000 implements MigrationInterface {
    name = 'AddCascadeDeleteToParticipantQuizAnswer1765723000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97" FOREIGN KEY ("answerQuizAnswerId") REFERENCES "quiz_answers"("quiz_answer_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97" FOREIGN KEY ("answerQuizAnswerId") REFERENCES "quiz_answers"("quiz_answer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
