import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCascadeDeleteToAllQuestRelations1766000000000 implements MigrationInterface {
    name = 'AddCascadeDeleteToAllQuestRelations1766000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quest_points" DROP CONSTRAINT "FK_598a55259727904920be5fd4abe"`);
        await queryRunner.query(`ALTER TABLE "quest_points" ADD CONSTRAINT "FK_598a55259727904920be5fd4abe" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_1b41ea27a794643c9f167f384d7"`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_1b41ea27a794643c9f167f384d7" FOREIGN KEY ("pointQuestPointId") REFERENCES "quest_points"("quest_point_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_0b0238710aa856609f41a2f05a1"`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_0b0238710aa856609f41a2f05a1" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_locations" DROP CONSTRAINT "FK_f90673cd44684e2157d0d3a3523"`);
        await queryRunner.query(`ALTER TABLE "participant_locations" ADD CONSTRAINT "FK_f90673cd44684e2157d0d3a3523" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_task_photos" DROP CONSTRAINT "FK_7310ae50ca2cc138ec687289db4"`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ADD CONSTRAINT "FK_7310ae50ca2cc138ec687289db4" FOREIGN KEY ("participant_task_id") REFERENCES "participant_tasks"("participant_task_id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83" FOREIGN KEY ("participantTaskParticipantTaskId") REFERENCES "participant_tasks"("participant_task_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83" FOREIGN KEY ("participantTaskParticipantTaskId") REFERENCES "participant_tasks"("participant_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_task_photos" DROP CONSTRAINT "FK_7310ae50ca2cc138ec687289db4"`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ADD CONSTRAINT "FK_7310ae50ca2cc138ec687289db4" FOREIGN KEY ("participant_task_id") REFERENCES "participant_tasks"("participant_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_locations" DROP CONSTRAINT "FK_f90673cd44684e2157d0d3a3523"`);
        await queryRunner.query(`ALTER TABLE "participant_locations" ADD CONSTRAINT "FK_f90673cd44684e2157d0d3a3523" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_0b0238710aa856609f41a2f05a1"`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_0b0238710aa856609f41a2f05a1" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_1b41ea27a794643c9f167f384d7"`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_1b41ea27a794643c9f167f384d7" FOREIGN KEY ("pointQuestPointId") REFERENCES "quest_points"("quest_point_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "quest_points" DROP CONSTRAINT "FK_598a55259727904920be5fd4abe"`);
        await queryRunner.query(`ALTER TABLE "quest_points" ADD CONSTRAINT "FK_598a55259727904920be5fd4abe" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
