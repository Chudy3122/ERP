import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeaveMigrationFields1749900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Allow fractional days (part-time hour-based leave converted to days)
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "annual_leave_days" TYPE double precision`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "carried_over_days" TYPE double precision`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "remote_work_days" TYPE double precision`);

    // Manual "used" baselines from the previous system (new approved requests add on top)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "used_leave_days" double precision NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "used_remote_days" double precision NOT NULL DEFAULT 0`);

    // Employment fraction (etat), e.g. "1", "7/8", "1/2"
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employment_fraction" varchar(10)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "employment_fraction"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "used_remote_days"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "used_leave_days"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "remote_work_days" TYPE integer USING ROUND("remote_work_days")`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "carried_over_days" TYPE integer USING ROUND("carried_over_days")`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "annual_leave_days" TYPE integer USING ROUND("annual_leave_days")`);
  }
}
