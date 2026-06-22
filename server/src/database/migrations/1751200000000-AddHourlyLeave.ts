import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHourlyLeave1751200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // New leave type value (guarded — enum exists once the table was created).
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_requests_leave_type_enum') AS exists`
    );
    if (exists) {
      await queryRunner.query(
        `ALTER TYPE leave_requests_leave_type_enum ADD VALUE IF NOT EXISTS 'occasional_hourly'`
      );
    }

    // total_days must allow fractional day-equivalents for hourly leave.
    await queryRunner.query(
      `ALTER TABLE leave_requests ALTER COLUMN total_days TYPE double precision USING total_days::double precision`
    );

    await queryRunner.query(`
      ALTER TABLE leave_requests
        ADD COLUMN IF NOT EXISTS start_time varchar(5),
        ADD COLUMN IF NOT EXISTS end_time varchar(5),
        ADD COLUMN IF NOT EXISTS hours double precision
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE leave_requests
        DROP COLUMN IF EXISTS start_time,
        DROP COLUMN IF EXISTS end_time,
        DROP COLUMN IF EXISTS hours
    `);
    await queryRunner.query(
      `ALTER TABLE leave_requests ALTER COLUMN total_days TYPE integer USING round(total_days)::integer`
    );
  }
}
