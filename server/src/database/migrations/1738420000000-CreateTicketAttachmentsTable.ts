import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateTicketAttachmentsTable1738420000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ticket_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'ticket_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'original_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'file_url',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'ticket_attachments',
      new TableForeignKey({
        columnNames: ['ticket_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tickets',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'ticket_attachments',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'ticket_attachments',
      new TableIndex({
        name: 'idx_ticket_attachments_ticket',
        columnNames: ['ticket_id'],
      })
    );

    await queryRunner.createIndex(
      'ticket_attachments',
      new TableIndex({
        name: 'idx_ticket_attachments_uploaded_by',
        columnNames: ['uploaded_by'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ticket_attachments');
  }
}
