import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddDepartmentIdToUsers1738500001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add department_id column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'department_id',
        type: 'uuid',
        isNullable: true,
      })
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['department_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'departments',
        onDelete: 'SET NULL',
      })
    );

    // Create index for faster queries
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_department_id',
        columnNames: ['department_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_department_id');

    const table = await queryRunner.getTable('users');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('department_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('users', foreignKey);
    }

    await queryRunner.dropColumn('users', 'department_id');
  }
}
