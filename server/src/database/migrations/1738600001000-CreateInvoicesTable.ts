import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateInvoicesTable1738600001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for invoice status
    await queryRunner.query(`
      CREATE TYPE invoice_status_enum AS ENUM ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'invoice_number',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'status',
            type: 'invoice_status_enum',
            default: "'draft'",
          },
          {
            name: 'client_id',
            type: 'uuid',
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'issue_date',
            type: 'date',
          },
          {
            name: 'sale_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'due_date',
            type: 'date',
          },
          {
            name: 'payment_terms',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'PLN'",
          },
          {
            name: 'net_total',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'vat_total',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'gross_total',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'paid_amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'internal_notes',
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

    // Foreign key to clients
    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['client_id'],
        referencedTableName: 'clients',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      })
    );

    // Foreign key to projects (optional)
    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Foreign key to users for creator
    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_invoice_number',
        columnNames: ['invoice_number'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_status',
        columnNames: ['status'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_client_id',
        columnNames: ['client_id'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_project_id',
        columnNames: ['project_id'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_issue_date',
        columnNames: ['issue_date'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_due_date',
        columnNames: ['due_date'],
      })
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_created_by',
        columnNames: ['created_by'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('invoices');
    await queryRunner.query(`DROP TYPE invoice_status_enum`);
  }
}
