import { MigrationInterface, QueryRunner } from "typeorm";

export class FixParticipantTaskPhotoEntity1763764059804 implements MigrationInterface {
    name = 'FixParticipantTaskPhotoEntity1763764059804'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ADD "participant_task_id" integer`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ADD CONSTRAINT "UQ_7310ae50ca2cc138ec687289db4" UNIQUE ("participant_task_id")`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" ADD CONSTRAINT "FK_7310ae50ca2cc138ec687289db4" FOREIGN KEY ("participant_task_id") REFERENCES "participant_tasks"("participant_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "participant_task_photos" DROP CONSTRAINT "FK_7310ae50ca2cc138ec687289db4"`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" DROP CONSTRAINT "UQ_7310ae50ca2cc138ec687289db4"`);
        await queryRunner.query(`ALTER TABLE "participant_task_photos" DROP COLUMN "participant_task_id"`);
    }

}
