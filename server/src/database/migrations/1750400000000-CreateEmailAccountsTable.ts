import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailAccountsTable1750400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_accounts (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email varchar(255) NOT NULL,
        display_name varchar(255),
        username varchar(255) NOT NULL,
        password_encrypted text NOT NULL,
        imap_host varchar(255) NOT NULL,
        imap_port integer NOT NULL DEFAULT 993,
        imap_secure boolean NOT NULL DEFAULT true,
        smtp_host varchar(255) NOT NULL,
        smtp_port integer NOT NULL DEFAULT 465,
        smtp_secure boolean NOT NULL DEFAULT true,
        is_active boolean NOT NULL DEFAULT true,
        last_checked_at timestamp,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS email_accounts`);
  }
}
