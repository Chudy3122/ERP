import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInvoiceItemsTable1738600002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'invoice_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'invoice_id',
            type: 'uuid',
          },
          {
            name: 'position',
            type: 'integer',
            default: 1,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 3,
            default: 1,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            default: "'szt.'",
          },
          {
            name: 'unit_price_net',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'vat_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 23.00,
          },
          {
            name: 'net_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'vat_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'gross_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Foreign key to invoices with CASCADE delete
    await queryRunner.createForeignKey(
      'invoice_items',
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedTableName: 'invoices',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Index on invoice_id
    await queryRunner.createIndex(
      'invoice_items',
      new TableIndex({
        name: 'IDX_invoice_items_invoice_id',
        columnNames: ['invoice_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invoice_items');
  }
}
