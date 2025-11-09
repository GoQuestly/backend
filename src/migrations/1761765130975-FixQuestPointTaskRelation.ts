import { MigrationInterface, QueryRunner } from "typeorm";

export class FixQuestPointTaskRelation1761765130975 implements MigrationInterface {
    name = 'FixQuestPointTaskRelation1761765130975'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const questTasksTable = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='quest_tasks' AND column_name='quest_point_id'
        `);

        if (questTasksTable.length > 0) {
            await queryRunner.query(`
                ALTER TABLE "quest_tasks" 
                DROP CONSTRAINT IF EXISTS "FK_776a3048badf27ebda112369770"
            `);

            await queryRunner.query(`
                ALTER TABLE "quest_tasks" 
                DROP CONSTRAINT IF EXISTS "UQ_776a3048badf27ebda112369770"
            `);

            await queryRunner.query(`
                ALTER TABLE "quest_tasks" 
                DROP COLUMN "quest_point_id"
            `);
        }

        await queryRunner.query(`
            ALTER TABLE "quest_points"
                ADD "quest_task_id" integer
        `);

        await queryRunner.query(`
            ALTER TABLE "quest_points"
                ADD CONSTRAINT "UQ_716780a1a0775427ade981f35d4" UNIQUE ("quest_task_id")
        `);

        await queryRunner.query(`
            ALTER TABLE "quest_points"
                ADD CONSTRAINT "FK_716780a1a0775427ade981f35d4"
                    FOREIGN KEY ("quest_task_id")
                        REFERENCES "quest_tasks"("quest_task_id")
                        ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quest_points" DROP CONSTRAINT "FK_716780a1a0775427ade981f35d4"`);
        await queryRunner.query(`ALTER TABLE "quest_points" DROP CONSTRAINT "UQ_716780a1a0775427ade981f35d4"`);
        await queryRunner.query(`ALTER TABLE "quest_points" DROP COLUMN "quest_task_id"`);

        await queryRunner.query(`ALTER TABLE "quest_tasks" ADD "quest_point_id" integer`);
        await queryRunner.query(`ALTER TABLE "quest_tasks" ADD CONSTRAINT "UQ_776a3048badf27ebda112369770" UNIQUE ("quest_point_id")`);
        await queryRunner.query(`ALTER TABLE "quest_tasks" ADD CONSTRAINT "FK_776a3048badf27ebda112369770" FOREIGN KEY ("quest_point_id") REFERENCES "quest_points"("quest_point_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
}