import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveYearAccounting1795000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "leave_year_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "year" integer NOT NULL CHECK ("year" BETWEEN 2026 AND 2100),
        "annual_leave_days" double precision NOT NULL,
        "carried_over_days" double precision NOT NULL,
        "used_leave_days" double precision NOT NULL,
        "remote_work_days" double precision NOT NULL,
        "used_remote_days" double precision NOT NULL,
        "working_hours_per_day" double precision NOT NULL,
        "employment_fraction" varchar(10),
        "carryover_source_year" integer,
        "carryover_adjustment" double precision NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_leave_year_balances_user_year" UNIQUE ("user_id", "year")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "leave_year_openings" (
        "year" integer PRIMARY KEY CHECK ("year" BETWEEN 2027 AND 2100),
        "approved_fingerprint" varchar(64) NOT NULL,
        "approved_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "approved_at" timestamptz NOT NULL,
        "opened_at" timestamptz
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "leave_year_openings"');
    await queryRunner.query('DROP TABLE "leave_year_balances"');
  }
}
