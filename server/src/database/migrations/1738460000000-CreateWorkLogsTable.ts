import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateWorkLogsTable1738460000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'work_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'work_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'hours',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_billable',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign key to users
    await queryRunner.createForeignKey(
      'work_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Foreign key to tasks
    await queryRunner.createForeignKey(
      'work_logs',
      new TableForeignKey({
        columnNames: ['task_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tasks',
        onDelete: 'SET NULL',
      })
    );

    // Foreign key to projects
    await queryRunner.createForeignKey(
      'work_logs',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'SET NULL',
      })
    );

    // Indexes for efficient queries
    await queryRunner.createIndex(
      'work_logs',
      new TableIndex({
        name: 'IDX_work_logs_user_date',
        columnNames: ['user_id', 'work_date'],
      })
    );

    await queryRunner.createIndex(
      'work_logs',
      new TableIndex({
        name: 'IDX_work_logs_task',
        columnNames: ['task_id'],
      })
    );

    await queryRunner.createIndex(
      'work_logs',
      new TableIndex({
        name: 'IDX_work_logs_project',
        columnNames: ['project_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('work_logs');

    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('work_logs', fk);
      }
    }

    await queryRunner.dropTable('work_logs', true);
  }
}
