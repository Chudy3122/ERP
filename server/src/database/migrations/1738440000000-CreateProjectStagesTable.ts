import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateProjectStagesTable1738440000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'project_stages',
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
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            default: "'#6B7280'",
          },
          {
            name: 'position',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_completed_stage',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Foreign key to projects
    await queryRunner.createForeignKey(
      'project_stages',
      new TableForeignKey({
        columnNames: ['project_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'projects',
        onDelete: 'CASCADE',
      })
    );

    // Index for faster queries
    await queryRunner.createIndex(
      'project_stages',
      new TableIndex({
        name: 'IDX_project_stages_project_id',
        columnNames: ['project_id'],
      })
    );

    await queryRunner.createIndex(
      'project_stages',
      new TableIndex({
        name: 'IDX_project_stages_position',
        columnNames: ['project_id', 'position'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('project_stages', 'IDX_project_stages_position');
    await queryRunner.dropIndex('project_stages', 'IDX_project_stages_project_id');
    await queryRunner.dropTable('project_stages');
  }
}
