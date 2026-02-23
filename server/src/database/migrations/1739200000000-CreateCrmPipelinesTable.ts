import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmPipelinesTable1739200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "crm_pipelines" (
        "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "color" VARCHAR(7) DEFAULT '#3B82F6',
        "position" INT DEFAULT 0,
        "is_active" BOOLEAN DEFAULT true,
        "created_by" UUID NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "PK_crm_pipelines" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_pipelines_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_pipelines"`);
  }
}
