import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkCrmRecordsToProjects1753200000000 implements MigrationInterface {
  name = 'LinkCrmRecordsToProjects1753200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "crm_project_records" ADD COLUMN IF NOT EXISTS "project_id" uuid`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_crm_project_records_project') THEN
          ALTER TABLE "crm_project_records"
            ADD CONSTRAINT "FK_crm_project_records_project"
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_crm_records_project" ON "crm_project_records" ("project_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_crm_records_project"`);
    await queryRunner.query(`ALTER TABLE "crm_project_records" DROP CONSTRAINT IF EXISTS "FK_crm_project_records_project"`);
    await queryRunner.query(`ALTER TABLE "crm_project_records" DROP COLUMN IF EXISTS "project_id"`);
  }
}
