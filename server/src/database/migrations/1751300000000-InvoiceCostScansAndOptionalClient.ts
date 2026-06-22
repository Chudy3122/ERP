import { MigrationInterface, QueryRunner } from 'typeorm';

export class InvoiceCostScansAndOptionalClient1751300000000 implements MigrationInterface {
  name = 'InvoiceCostScansAndOptionalClient1751300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Cost invoices (receipts) may have no supplier in the client list
    await queryRunner.query(`ALTER TABLE invoices ALTER COLUMN client_id DROP NOT NULL`);
    // Scans/photos of the cost invoice (array of {name,url,size,uploaded_at})
    await queryRunner.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS scans jsonb NOT NULL DEFAULT '[]'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE invoices DROP COLUMN IF EXISTS scans`);
    await queryRunner.query(`ALTER TABLE invoices ALTER COLUMN client_id SET NOT NULL`);
  }
}
