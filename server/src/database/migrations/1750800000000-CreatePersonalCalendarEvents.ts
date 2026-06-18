import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalCalendarEvents1750800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // New notification type for calendar reminders (guarded — enum may not exist yet).
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (exists) {
      await queryRunner.query(
        `ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'calendar_reminder'`
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS personal_calendar_events (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        description text,
        event_date timestamp NOT NULL,
        all_day boolean NOT NULL DEFAULT false,
        remind_minutes_before integer,
        recurrence varchar(20) NOT NULL DEFAULT 'none',
        recurrence_until timestamp,
        color varchar(20),
        next_remind_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pce_user ON personal_calendar_events(user_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_pce_next_remind ON personal_calendar_events(next_remind_at)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS personal_calendar_events`);
  }
}
