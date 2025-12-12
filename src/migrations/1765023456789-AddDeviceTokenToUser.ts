import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeviceTokenToUser1765023456789 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            ADD COLUMN "device_token" TEXT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user"
            DROP COLUMN "device_token"
        `);
    }

}