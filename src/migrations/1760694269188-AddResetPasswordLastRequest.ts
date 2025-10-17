import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResetPasswordLastRequest1760694269188 implements MigrationInterface {
    name = 'AddResetPasswordLastRequest1760694269188'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "reset_password_last_request" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "reset_password_last_request"`);
    }

}
