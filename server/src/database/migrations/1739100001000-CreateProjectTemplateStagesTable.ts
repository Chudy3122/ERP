import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectTemplateStagesTable1739100001000 implements MigrationInterface {
  name = 'CreateProjectTemplateStagesTable1739100001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_template_stages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "name" varchar(100) NOT NULL,
        "description" text,
        "color" varchar(7) NOT NULL DEFAULT '#6B7280',
        "position" integer NOT NULL DEFAULT 0,
        "is_completed_stage" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_project_template_stages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_template_stages_template" FOREIGN KEY ("template_id") REFERENCES "project_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_project_template_stages_template_id" ON "project_template_stages" ("template_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_project_template_stages_template_id"`);
    await queryRunner.query(`DROP TABLE "project_template_stages"`);
  }
}
