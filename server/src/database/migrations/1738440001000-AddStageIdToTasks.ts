import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddStageIdToTasks1738440001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stage_id column to tasks table
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'stage_id',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'tasks',
      new TableForeignKey({
        columnNames: ['stage_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'project_stages',
        onDelete: 'SET NULL',
      })
    );

    // Create index for faster queries
    await queryRunner.createIndex(
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_stage_id',
        columnNames: ['stage_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('tasks', 'IDX_tasks_stage_id');

    const table = await queryRunner.getTable('tasks');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('stage_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('tasks', foreignKey);
    }

    await queryRunner.dropColumn('tasks', 'stage_id');
  }
}
