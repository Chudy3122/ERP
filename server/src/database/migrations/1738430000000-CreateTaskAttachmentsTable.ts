import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTaskAttachmentsTable1738430000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'task_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'task_id',
            type: 'uuid',
          },
          {
            name: 'file_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'original_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'file_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'file_size',
            type: 'bigint',
          },
          {
            name: 'file_url',
            type: 'text',
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

    await queryRunner.createForeignKey(
      'task_attachments',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tasks',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'task_attachments',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('task_attachments');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('task_attachments', fk);
      }
    }
    await queryRunner.dropTable('task_attachments');
  }
}
