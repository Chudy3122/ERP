import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmDealsTable1739200002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "deal_status_enum" AS ENUM ('open', 'won', 'lost')
    `);

    await queryRunner.query(`
      CREATE TYPE "deal_priority_enum" AS ENUM ('low', 'medium', 'high', 'critical')
    `);

    await queryRunner.query(`
      CREATE TABLE "crm_deals" (
        "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "pipeline_id" UUID NOT NULL,
        "stage_id" UUID NOT NULL,
        "client_id" UUID,
        "contact_person" VARCHAR(255),
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "value" DECIMAL(14,2) DEFAULT 0,
        "currency" VARCHAR(3) DEFAULT 'PLN',
        "status" "deal_status_enum" DEFAULT 'open',
        "priority" "deal_priority_enum" DEFAULT 'medium',
        "expected_close_date" DATE,
        "actual_close_date" DATE,
        "assigned_to" UUID,
        "lost_reason" TEXT,
        "won_invoice_id" UUID,
        "position" INT DEFAULT 0,
        "created_by" UUID NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "PK_crm_deals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_deals_pipeline" FOREIGN KEY ("pipeline_id")
          REFERENCES "crm_pipelines"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_crm_deals_stage" FOREIGN KEY ("stage_id")
          REFERENCES "crm_pipeline_stages"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_crm_deals_client" FOREIGN KEY ("client_id")
          REFERENCES "clients"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_crm_deals_assigned_to" FOREIGN KEY ("assigned_to")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_crm_deals_won_invoice" FOREIGN KEY ("won_invoice_id")
          REFERENCES "invoices"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_crm_deals_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_pipeline_id" ON "crm_deals" ("pipeline_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_stage_id" ON "crm_deals" ("stage_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_client_id" ON "crm_deals" ("client_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_assigned_to" ON "crm_deals" ("assigned_to")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_status" ON "crm_deals" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deals_expected_close" ON "crm_deals" ("expected_close_date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_deals"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "deal_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "deal_status_enum"`);
  }
}
