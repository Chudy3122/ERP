import { MigrationInterface, QueryRunner } from 'typeorm';

export class MateuszDeviceAndAutoClose1752100000000 implements MigrationInterface {
  name = 'MateuszDeviceAndAutoClose1752100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS force_desktop_device boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_close_after_minutes integer`);
    // Mateusz Chudaś: always show device as desktop + auto-close work after 8h
    await queryRunner.query(
      `UPDATE users SET force_desktop_device = true, auto_close_after_minutes = 480 WHERE lower(email) = 'mateusz.chudas@itcomplete.pl'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS auto_close_after_minutes`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS force_desktop_device`);
  }
}
