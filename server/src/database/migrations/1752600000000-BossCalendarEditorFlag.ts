import { MigrationInterface, QueryRunner } from 'typeorm';

export class BossCalendarEditorFlag1752600000000 implements MigrationInterface {
  name = 'BossCalendarEditorFlag1752600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Per-user grant to add/edit boss-calendar meetings, on top of the editor roles.
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS can_edit_boss_calendar boolean NOT NULL DEFAULT false`
    );
    // Grant it to Jerzy Szyndler (an employee, so not covered by any editor role).
    await queryRunner.query(
      `UPDATE users SET can_edit_boss_calendar = true WHERE lower(email) = 'jerzy.szyndler@itcomplete.pl'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS can_edit_boss_calendar`);
  }
}
