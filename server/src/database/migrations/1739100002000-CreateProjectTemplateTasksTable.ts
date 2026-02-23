import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectTemplateTasksTable1739100002000 implements MigrationInterface {
  name = 'CreateProjectTemplateTasksTable1739100002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "template_task_priority_enum" AS ENUM ('low', 'medium', 'high', 'urgent')
    `);

    await queryRunner.query(`
      CREATE TABLE "project_template_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "stage_position" integer NOT NULL DEFAULT 0,
        "title" varchar(255) NOT NULL,
        "description" text,
        "priority" "template_task_priority_enum" NOT NULL DEFAULT 'medium',
        "estimated_hours" decimal(6,2),
        "order_index" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_project_template_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_template_tasks_template" FOREIGN KEY ("template_id") REFERENCES "project_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_template_tasks_template_id" ON "project_template_tasks" ("template_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_project_template_tasks_template_id"`);
    await queryRunner.query(`DROP TABLE "project_template_tasks"`);
    await queryRunner.query(`DROP TYPE "template_task_priority_enum"`);
  }
}
