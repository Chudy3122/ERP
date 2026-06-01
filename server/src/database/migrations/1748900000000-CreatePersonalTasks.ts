import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalTasks1748900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('personal_tasks');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "personal_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'todo',
        "order_index" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personal_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_personal_tasks_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_personal_tasks_user_id" ON "personal_tasks" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "personal_tasks"`);
  }
}
