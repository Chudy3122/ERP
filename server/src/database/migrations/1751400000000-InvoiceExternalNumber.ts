import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceExternalNumber1751400000000 implements MigrationInterface {
  name = 'InvoiceExternalNumber1751400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Supplier's invoice/receipt number printed on the source document (cost invoices)
    await queryRunner.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS external_number varchar(100)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS external_number`);
  }
}
