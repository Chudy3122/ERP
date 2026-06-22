import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceCompany1751700000000 implements MigrationInterface {
  name = 'InvoiceCompany1751700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Which of our companies the invoice concerns
    await queryRunner.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS company varchar(120)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS company`);
  }
}
