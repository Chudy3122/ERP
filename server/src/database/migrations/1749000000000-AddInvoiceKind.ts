import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceKind1749000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.hasTable('invoices');
    if (!table) return;
    const hasColumn = await queryRunner.hasColumn('invoices', 'kind');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN "kind" varchar(10) NOT NULL DEFAULT 'income'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "kind"`);
  }
}
