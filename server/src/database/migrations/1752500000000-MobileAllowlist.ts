import { MigrationInterface, QueryRunner } from 'typeorm';

export class MobileAllowlist1752500000000 implements MigrationInterface {
  name = 'MobileAllowlist1752500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Everyone is blocked on phone/tablet by default; only allow-listed accounts may log in.
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_allowed boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `UPDATE users SET mobile_allowed = true WHERE lower(email) IN ('andrzej.kusnierz@itcomplete.pl', 'mateusz.chudas@itcomplete.pl')`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS mobile_allowed`);
  }
}
