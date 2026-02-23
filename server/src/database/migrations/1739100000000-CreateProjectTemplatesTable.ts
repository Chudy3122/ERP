import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectTemplatesTable1739100000000 implements MigrationInterface {
  name = 'CreateProjectTemplatesTable1739100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_templates" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_templates_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_templates"`);
  }
}
