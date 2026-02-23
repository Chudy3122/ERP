import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmPipelineStagesTable1739200001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "crm_pipeline_stages" (
        "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
        "pipeline_id" UUID NOT NULL,
        "name" VARCHAR(100) NOT NULL,
        "color" VARCHAR(7) DEFAULT '#6B7280',
        "position" INT DEFAULT 0,
        "win_probability" INT DEFAULT 0,
        "is_won_stage" BOOLEAN DEFAULT false,
        "is_lost_stage" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "PK_crm_pipeline_stages" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_pipeline_stages_pipeline" FOREIGN KEY ("pipeline_id")
          REFERENCES "crm_pipelines"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_crm_pipeline_stages_pipeline_id" ON "crm_pipeline_stages" ("pipeline_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_pipeline_stages"`);
  }
}
