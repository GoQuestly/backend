import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1760194315192 implements MigrationInterface {
    name = 'InitialMigration1760194315192'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "quiz_answers" ("quiz_answer_id" SERIAL NOT NULL, "answer" character varying NOT NULL, "isCorrect" boolean NOT NULL DEFAULT false, "questionQuizQuestionId" integer, CONSTRAINT "PK_5ecdf50df879fe63b8e554840f0" PRIMARY KEY ("quiz_answer_id"))`);
        await queryRunner.query(`CREATE TABLE "quiz_questions" ("quiz_question_id" SERIAL NOT NULL, "question" character varying NOT NULL, "order_number" integer NOT NULL, "score_points_count" integer NOT NULL, "taskQuestTaskId" integer, CONSTRAINT "PK_6b1e6e2d20d15a0e67a105c751d" PRIMARY KEY ("quiz_question_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quest_sessions_end_reason_enum" AS ENUM('finished', 'terminated_by_organizer', 'terminated_by_participant')`);
        await queryRunner.query(`CREATE TABLE "quest_sessions" ("quest_session_id" SERIAL NOT NULL, "start_date" TIMESTAMP NOT NULL, "end_date" TIMESTAMP NOT NULL, "end_reason" "public"."quest_sessions_end_reason_enum", "invite_token" character varying NOT NULL, "questQuestId" integer, CONSTRAINT "UQ_3f57380cfcfddfc0b356f6f77d5" UNIQUE ("invite_token"), CONSTRAINT "PK_b926e716b94e36b5d998d07e6f7" PRIMARY KEY ("quest_session_id"))`);
        await queryRunner.query(`CREATE TABLE "participant_locations" ("participant_location_id" SERIAL NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "timestamp" TIMESTAMP NOT NULL, "participantParticipantId" integer, CONSTRAINT "PK_3ed40b41ba1e92befb4aec31cea" PRIMARY KEY ("participant_location_id"))`);
        await queryRunner.query(`CREATE TABLE "participant_points" ("participant_point_id" SERIAL NOT NULL, "passed_date" TIMESTAMP NOT NULL, "participantParticipantId" integer, "pointQuestPointId" integer, CONSTRAINT "PK_9f966dea0406aa5a9b8d283f776" PRIMARY KEY ("participant_point_id"))`);
        await queryRunner.query(`CREATE TABLE "participants" ("participant_id" SERIAL NOT NULL, "userUserId" integer, "sessionQuestSessionId" integer, CONSTRAINT "PK_21c0dc46f025572c6b99626b9eb" PRIMARY KEY ("participant_id"))`);
        await queryRunner.query(`CREATE TABLE "participant_task_photos" ("participant_task_photo_id" SERIAL NOT NULL, "photo_url" character varying NOT NULL, "upload_date" TIMESTAMP NOT NULL, "is_approved" boolean NOT NULL, CONSTRAINT "PK_48e4140d9413027f7d9469c787e" PRIMARY KEY ("participant_task_photo_id"))`);
        await queryRunner.query(`CREATE TABLE "participant_task_quiz_answers" ("participant_task_quiz_answer_id" SERIAL NOT NULL, "answer_date" TIMESTAMP NOT NULL, "participantTaskParticipantTaskId" integer, "answerQuizAnswerId" integer, CONSTRAINT "PK_6d3fd5c9d0bfe613c7861f5b3ce" PRIMARY KEY ("participant_task_quiz_answer_id"))`);
        await queryRunner.query(`CREATE TABLE "participant_tasks" ("participant_task_id" SERIAL NOT NULL, "completed_date" TIMESTAMP NOT NULL, "participantParticipantId" integer, "taskQuestTaskId" integer, CONSTRAINT "PK_45f44a9820927d0ba19524a2d48" PRIMARY KEY ("participant_task_id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quest_tasks_task_type_enum" AS ENUM('code_word', 'quiz', 'photo')`);
        await queryRunner.query(`CREATE TABLE "quest_tasks" ("quest_task_id" SERIAL NOT NULL, "task_type" "public"."quest_tasks_task_type_enum" NOT NULL, "max_score_points_count" integer NOT NULL, "code_word" character varying NOT NULL, "description" text, "max_duration_seconds" integer NOT NULL, "success_score_points_percent" integer NOT NULL, "is_required_for_next_point" boolean NOT NULL, CONSTRAINT "PK_e9737a3851e272bcde77444df10" PRIMARY KEY ("quest_task_id"))`);
        await queryRunner.query(`CREATE TABLE "quest_points" ("quest_point_id" SERIAL NOT NULL, "name" character varying NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "order_num" integer NOT NULL, "questQuestId" integer, CONSTRAINT "PK_277d8a33d83075e18b9f9929c7b" PRIMARY KEY ("quest_point_id"))`);
        await queryRunner.query(`CREATE TABLE "quests" ("quest_id" SERIAL NOT NULL, "title" character varying NOT NULL, "description" character varying NOT NULL, "creation_date" TIMESTAMP NOT NULL DEFAULT now(), "update_date" TIMESTAMP NOT NULL DEFAULT now(), "starting_latitude" double precision NOT NULL, "starting_longitude" double precision NOT NULL, "starting_radius_meters" integer NOT NULL, "max_duration_minutes" integer NOT NULL, "photo_url" character varying NOT NULL, "min_participant_count" integer NOT NULL, "max_participant_count" integer NOT NULL, "organizerUserId" integer, CONSTRAINT "PK_9cdcb610c502f26c461b74681da" PRIMARY KEY ("quest_id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("user_id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "email" character varying(100) NOT NULL, "password" character varying(255) NOT NULL, "photo_url" character varying NOT NULL, CONSTRAINT "PK_758b8ce7c18b9d347461b30228d" PRIMARY KEY ("user_id"))`);
        await queryRunner.query(`CREATE TABLE "admins" ("admin_id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, CONSTRAINT "UQ_051db7d37d478a69a7432df1479" UNIQUE ("email"), CONSTRAINT "PK_88070d08be64522fc84fdefef85" PRIMARY KEY ("admin_id"))`);
        await queryRunner.query(`ALTER TABLE "quiz_answers" ADD CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255" FOREIGN KEY ("questionQuizQuestionId") REFERENCES "quiz_questions"("quiz_question_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" ADD CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" ADD CONSTRAINT "FK_490c5cea8927e1d7878a699d926" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_locations" ADD CONSTRAINT "FK_f90673cd44684e2157d0d3a3523" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_0b0238710aa856609f41a2f05a1" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_points" ADD CONSTRAINT "FK_1b41ea27a794643c9f167f384d7" FOREIGN KEY ("pointQuestPointId") REFERENCES "quest_points"("quest_point_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_77bea66b0124d5c5c20ca412c04" FOREIGN KEY ("userUserId") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participants" ADD CONSTRAINT "FK_936260519a2d07bceffd4a57d89" FOREIGN KEY ("sessionQuestSessionId") REFERENCES "quest_sessions"("quest_session_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83" FOREIGN KEY ("participantTaskParticipantTaskId") REFERENCES "participant_tasks"("participant_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" ADD CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97" FOREIGN KEY ("answerQuizAnswerId") REFERENCES "quiz_answers"("quiz_answer_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210" FOREIGN KEY ("participantParticipantId") REFERENCES "participants"("participant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" ADD CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1" FOREIGN KEY ("taskQuestTaskId") REFERENCES "quest_tasks"("quest_task_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quest_points" ADD CONSTRAINT "FK_598a55259727904920be5fd4abe" FOREIGN KEY ("questQuestId") REFERENCES "quests"("quest_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "quests" ADD CONSTRAINT "FK_58a68b18ba951c12dd02aa2a2d0" FOREIGN KEY ("organizerUserId") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "quests" DROP CONSTRAINT "FK_58a68b18ba951c12dd02aa2a2d0"`);
        await queryRunner.query(`ALTER TABLE "quest_points" DROP CONSTRAINT "FK_598a55259727904920be5fd4abe"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_810f93c47fc0ac3b654c2cbf1d1"`);
        await queryRunner.query(`ALTER TABLE "participant_tasks" DROP CONSTRAINT "FK_dfc1fef4fa314900a9e5e7d8210"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_dcc7e1a2730ca40bd7d06dbdd97"`);
        await queryRunner.query(`ALTER TABLE "participant_task_quiz_answers" DROP CONSTRAINT "FK_c4c0686d70f5c94783c10fd7c83"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_936260519a2d07bceffd4a57d89"`);
        await queryRunner.query(`ALTER TABLE "participants" DROP CONSTRAINT "FK_77bea66b0124d5c5c20ca412c04"`);
        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_1b41ea27a794643c9f167f384d7"`);
        await queryRunner.query(`ALTER TABLE "participant_points" DROP CONSTRAINT "FK_0b0238710aa856609f41a2f05a1"`);
        await queryRunner.query(`ALTER TABLE "participant_locations" DROP CONSTRAINT "FK_f90673cd44684e2157d0d3a3523"`);
        await queryRunner.query(`ALTER TABLE "quest_sessions" DROP CONSTRAINT "FK_490c5cea8927e1d7878a699d926"`);
        await queryRunner.query(`ALTER TABLE "quiz_questions" DROP CONSTRAINT "FK_88300ceb18a754c1e4a1bfa2d92"`);
        await queryRunner.query(`ALTER TABLE "quiz_answers" DROP CONSTRAINT "FK_e6c75bb4e0306f3b706488dd255"`);
        await queryRunner.query(`DROP TABLE "admins"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "quests"`);
        await queryRunner.query(`DROP TABLE "quest_points"`);
        await queryRunner.query(`DROP TABLE "quest_tasks"`);
        await queryRunner.query(`DROP TYPE "public"."quest_tasks_task_type_enum"`);
        await queryRunner.query(`DROP TABLE "participant_tasks"`);
        await queryRunner.query(`DROP TABLE "participant_task_quiz_answers"`);
        await queryRunner.query(`DROP TABLE "participant_task_photos"`);
        await queryRunner.query(`DROP TABLE "participants"`);
        await queryRunner.query(`DROP TABLE "participant_points"`);
        await queryRunner.query(`DROP TABLE "participant_locations"`);
        await queryRunner.query(`DROP TABLE "quest_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."quest_sessions_end_reason_enum"`);
        await queryRunner.query(`DROP TABLE "quiz_questions"`);
        await queryRunner.query(`DROP TABLE "quiz_answers"`);
    }

}
