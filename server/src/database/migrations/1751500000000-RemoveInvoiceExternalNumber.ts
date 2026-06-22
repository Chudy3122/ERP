import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInvoiceExternalNumber1751500000000 implements MigrationInterface {
  name = 'RemoveInvoiceExternalNumber1751500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // external_number was a misstep — the invoice_number itself is now user-editable
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS external_number`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS external_number varchar(100)`);
  }
}
