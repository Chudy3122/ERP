import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveYearPlans1795000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "leave_year_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "year" integer NOT NULL CHECK ("year" BETWEEN 2026 AND 2100),
        "annual_leave_days" double precision NOT NULL CHECK ("annual_leave_days" BETWEEN 0 AND 366),
        "remote_work_days" double precision NOT NULL CHECK ("remote_work_days" BETWEEN 0 AND 366),
        "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_year_plans" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_leave_year_plans_user_year" UNIQUE ("user_id", "year")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "leave_year_plans"');
  }
}
