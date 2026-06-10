import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBossCalendarEndDate1749800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Optional end date so a single entry can span multiple days (e.g. urlop).
    await queryRunner.query(`
      ALTER TABLE "boss_calendar"
      ADD COLUMN IF NOT EXISTS "end_date" date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "boss_calendar" DROP COLUMN IF EXISTS "end_date"`);
  }
}
