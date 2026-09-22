import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrmProjectRecords1753100000000 implements MigrationInterface {
  name = 'CreateCrmProjectRecords1753100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_project_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "info" text,
        "created_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_project_records" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_project_participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_record_id" uuid NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "role" varchar(255),
        "company" varchar(255),
        "email" varchar(255),
        "phone" varchar(50),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_crm_project_participants" PRIMARY KEY ("id"),
        CONSTRAINT "FK_crm_project_participants_record" FOREIGN KEY ("project_record_id")
          REFERENCES "crm_project_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_crm_participants_record" ON "crm_project_participants" ("project_record_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_project_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "crm_project_records"`);
  }
}
