import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProjectAttachmentsTable1738450000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_attachments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
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
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'project_attachments',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'project_attachments',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
      })
    );

    // Index
    await queryRunner.createIndex(
      'project_attachments',
      new TableIndex({
        name: 'IDX_project_attachments_project_id',
        columnNames: ['project_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('project_attachments', 'IDX_project_attachments_project_id');
    await queryRunner.dropTable('project_attachments');
  }
}
