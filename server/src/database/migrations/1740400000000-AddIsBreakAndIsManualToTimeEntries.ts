import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsBreakAndIsManualToTimeEntries1740400000000 implements MigrationInterface {
  name = 'AddIsBreakAndIsManualToTimeEntries1740400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "is_break" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "time_entries" ADD COLUMN IF NOT EXISTS "is_manual" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "is_manual"`);
    await queryRunner.query(`ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "is_break"`);
  }
}
