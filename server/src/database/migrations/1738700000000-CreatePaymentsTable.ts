import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePaymentsTable1738700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for payment method
    await queryRunner.query(`
      CREATE TYPE payment_method_enum AS ENUM ('bank_transfer', 'cash', 'card', 'other')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'payment_date',
            type: 'date',
          },
          {
            name: 'payment_method',
            type: 'payment_method_enum',
            default: "'bank_transfer'",
          },
          {
            name: 'reference_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
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

    // Foreign key to invoices
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['invoice_id'],
        referencedTableName: 'invoices',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Foreign key to users for creator
    await queryRunner.createForeignKey(
      'payments',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_invoice_id',
        columnNames: ['invoice_id'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_payment_date',
        columnNames: ['payment_date'],
      })
    );

    await queryRunner.createIndex(
      'payments',
      new TableIndex({
        name: 'IDX_payments_created_by',
        columnNames: ['created_by'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments');
    await queryRunner.query(`DROP TYPE payment_method_enum`);
  }
}
