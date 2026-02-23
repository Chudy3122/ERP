import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmDealActivitiesTable1739200003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "deal_activity_type_enum" AS ENUM (
        'note', 'call', 'meeting', 'email', 'task', 'stage_change', 'status_change'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "crm_deal_activities" (
        "id" UUID DEFAULT uuid_generate_v4() NOT NULL,
        "deal_id" UUID NOT NULL,
        "type" "deal_activity_type_enum" NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "scheduled_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "is_completed" BOOLEAN DEFAULT false,
        "metadata" JSONB,
        "created_by" UUID NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
        CONSTRAINT "PK_crm_deal_activities" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_deal_activities_deal" FOREIGN KEY ("deal_id")
          REFERENCES "crm_deals"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_crm_deal_activities_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_crm_deal_activities_deal_id" ON "crm_deal_activities" ("deal_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deal_activities_type" ON "crm_deal_activities" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_crm_deal_activities_scheduled" ON "crm_deal_activities" ("scheduled_at")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_deal_activities"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "deal_activity_type_enum"`);
  }
}
