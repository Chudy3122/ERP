import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeaveCarryoverAndSettings1749500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Carried-over (zaległy) leave days from the previous year
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "carried_over_days" integer NOT NULL DEFAULT 0
    `);

    // Small key/value store for app-level markers (e.g. last leave rollover year)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" varchar(100) PRIMARY KEY,
        "value" varchar(255),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "carried_over_days"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings"`);
  }
}
