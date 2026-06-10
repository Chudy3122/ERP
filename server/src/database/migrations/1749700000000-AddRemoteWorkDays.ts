import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRemoteWorkDays1749700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Yearly remote-work (praca zdalna) entitlement — official default is 24 days
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "remote_work_days" integer NOT NULL DEFAULT 24
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "remote_work_days"`);
  }
}
