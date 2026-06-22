import { MigrationInterface, QueryRunner } from 'typeorm';

export class BossCalendarCompleted1751600000000 implements MigrationInterface {
  name = 'BossCalendarCompleted1751600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE boss_calendar ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE boss_calendar ADD COLUMN IF NOT EXISTS completed_at timestamp`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE boss_calendar DROP COLUMN IF EXISTS completed_at`);
    await queryRunner.query(`ALTER TABLE boss_calendar DROP COLUMN IF EXISTS completed`);
  }
}
