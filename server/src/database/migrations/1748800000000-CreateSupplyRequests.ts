import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplyRequests1748800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('supply_requests');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "supply_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "item_name" varchar(255) NOT NULL,
        "quantity" integer NOT NULL DEFAULT 1,
        "category" varchar(20) NOT NULL DEFAULT 'office',
        "priority" varchar(20) NOT NULL DEFAULT 'medium',
        "description" text,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "reviewed_at" TIMESTAMP,
        "review_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_supply_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_supply_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_supply_reviewer" FOREIGN KEY ("reviewed_by")
          REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_supply_user_id" ON "supply_requests" ("user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_supply_status" ON "supply_requests" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "supply_requests"`);
  }
}
