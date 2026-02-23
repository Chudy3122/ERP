import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractsTable1738800000000 implements MigrationInterface {
  name = 'CreateContractsTable1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create contract status enum
    await queryRunner.query(`
      CREATE TYPE "contract_status_enum" AS ENUM (
        'draft',
        'pending',
        'active',
        'expired',
        'terminated',
        'renewed'
      )
    `);

    // Create contracts table
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contract_number" varchar(50) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "client_id" uuid NOT NULL,
        "status" "contract_status_enum" NOT NULL DEFAULT 'draft',
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "value" decimal(14,2),
        "currency" varchar(3) NOT NULL DEFAULT 'PLN',
        "payment_terms" text,
        "auto_renew" boolean NOT NULL DEFAULT false,
        "renewal_notice_days" integer NOT NULL DEFAULT 30,
        "notes" text,
        "internal_notes" text,
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_contracts_contract_number" UNIQUE ("contract_number"),
        CONSTRAINT "PK_contracts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contracts_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_contracts_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_client_id" ON "contracts" ("client_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_status" ON "contracts" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_end_date" ON "contracts" ("end_date")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_contract_number" ON "contracts" ("contract_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_contracts_contract_number"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_end_date"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_contracts_client_id"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP TYPE "contract_status_enum"`);
  }
}
