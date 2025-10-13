import { MigrationInterface, QueryRunner } from "typeorm";

export class UserEntities1760353644805 implements MigrationInterface {
    name = 'UserEntities1760353644805'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "photo_url" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "photo_url" SET NOT NULL`);
    }

}
