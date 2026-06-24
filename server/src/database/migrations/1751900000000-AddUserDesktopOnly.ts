import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDesktopOnly1751900000000 implements MigrationInterface {
  name = 'AddUserDesktopOnly1751900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS desktop_only boolean NOT NULL DEFAULT false`);
    // Aleksandra Nazar may log in only from a computer
    await queryRunner.query(
      `UPDATE users SET desktop_only = true WHERE lower(email) = 'aleksandra.nazar@itcomplete.pl'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS desktop_only`);
  }
}
