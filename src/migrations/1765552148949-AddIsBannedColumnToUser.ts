import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsBannedColumnToUser1765552148949 implements MigrationInterface {
    name = 'AddIsBannedColumnToUser1765552148949'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "is_banned" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "is_banned"`);
    }

}
