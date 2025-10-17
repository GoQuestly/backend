import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationFields1760705782965 implements MigrationInterface {
    name = 'AddEmailVerificationFields1760705782965'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "is_email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user" ADD "email_verification_code" character varying(6)`);
        await queryRunner.query(`ALTER TABLE "user" ADD "email_verification_code_expires" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "user" ADD "email_verification_last_request" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email_verification_last_request"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email_verification_code_expires"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "email_verification_code"`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "is_email_verified"`);
    }

}
