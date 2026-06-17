import { MigrationInterface, QueryRunner } from 'typeorm';

// The built-in email module was removed; drop its table.
export class DropEmailAccountsTable1750500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_accounts`);
  }

  public async down(): Promise<void> {
    // No-op: the email module no longer exists.
  }
}
