import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDepartmentsTable1738500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'departments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '20',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'parent_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'head_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'order_index',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '50',
            isNullable: true,
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

    // Self-referential foreign key for hierarchy
    await queryRunner.createForeignKey(
      'departments',
      new TableForeignKey({
        columnNames: ['parent_id'],
        referencedTableName: 'departments',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Foreign key to users for department head
    await queryRunner.createForeignKey(
      'departments',
      new TableForeignKey({
        columnNames: ['head_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'departments',
      new TableIndex({
        name: 'IDX_departments_parent_id',
        columnNames: ['parent_id'],
      })
    );

    await queryRunner.createIndex(
      'departments',
      new TableIndex({
        name: 'IDX_departments_code',
        columnNames: ['code'],
      })
    );

    await queryRunner.createIndex(
      'departments',
      new TableIndex({
        name: 'IDX_departments_is_active',
        columnNames: ['is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('departments');
  }
}
