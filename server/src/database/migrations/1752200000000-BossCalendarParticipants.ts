import { MigrationInterface, QueryRunner } from 'typeorm';

export class BossCalendarParticipants1752200000000 implements MigrationInterface {
  name = 'BossCalendarParticipants1752200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE boss_calendar ADD COLUMN IF NOT EXISTS participant_ids jsonb NOT NULL DEFAULT '[]'`
    );

    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (exists) {
      await queryRunner.query(
        `ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'boss_calendar_update'`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE boss_calendar DROP COLUMN IF EXISTS participant_ids`);
  }
}
