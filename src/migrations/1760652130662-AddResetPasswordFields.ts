import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResetPasswordFields1760652130662 implements MigrationInterface {
    name = 'AddResetPasswordFields1760652130662'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "reset_password_token" character varying(500)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "reset_password_expires" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reset_password_expires"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reset_password_token"`);
    }

}
