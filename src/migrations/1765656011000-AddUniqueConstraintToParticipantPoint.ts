import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToParticipantPoint1765656011000 implements MigrationInterface {
    name = 'AddUniqueConstraintToParticipantPoint1765656011000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM participant_points a
            USING participant_points b
            WHERE a.participant_point_id > b.participant_point_id
            AND a."participantParticipantId" = b."participantParticipantId"
            AND a."pointQuestPointId" = b."pointQuestPointId"
        `);

        await queryRunner.query(`
            ALTER TABLE "participant_points"
            ADD CONSTRAINT "UQ_participant_point"
            UNIQUE ("participantParticipantId", "pointQuestPointId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "participant_points"
            DROP CONSTRAINT "UQ_participant_point"
        `);
    }
}
