import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractAttachmentsTable1738800001000 implements MigrationInterface {
  name = 'CreateContractAttachmentsTable1738800001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contract_attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contract_id" uuid NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "original_name" varchar(255) NOT NULL,
        "file_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "file_url" text NOT NULL,
        "uploaded_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contract_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_contract_attachments_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_contract_attachments_uploaded_by" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_contract_attachments_contract_id" ON "contract_attachments" ("contract_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_contract_attachments_contract_id"`);
    await queryRunner.query(`DROP TABLE "contract_attachments"`);
  }
}
