import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddEmployeeFieldsToUsers1738300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add employee-specific fields to users table
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'employee_id',
        type: 'varchar',
        length: '20',
        isNullable: true,
        isUnique: true,
      }),
      new TableColumn({
        name: 'position',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
      new TableColumn({
        name: 'hire_date',
        type: 'date',
        isNullable: true,
      }),
      new TableColumn({
        name: 'contract_type',
        type: 'enum',
        enum: ['full_time', 'part_time', 'contract', 'intern'],
        isNullable: true,
      }),
      new TableColumn({
        name: 'manager_id',
        type: 'uuid',
        isNullable: true,
      }),
      new TableColumn({
        name: 'working_hours_per_day',
        type: 'decimal',
        precision: 4,
        scale: 2,
        default: 8.0,
      }),
      new TableColumn({
        name: 'annual_leave_days',
        type: 'integer',
        default: 20,
      }),
    ]);

    // Add foreign key for manager_id (self-reference)
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['manager_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Create index for employee_id
    await queryRunner.query(`CREATE INDEX "IDX_users_employee_id" ON "users" ("employee_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_users_employee_id"`);

    // Drop foreign key
    const table = await queryRunner.getTable('users');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.indexOf('manager_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('users', foreignKey);
    }

    // Drop columns
    await queryRunner.dropColumns('users', [
      'employee_id',
      'position',
      'hire_date',
      'contract_type',
      'manager_id',
      'working_hours_per_day',
      'annual_leave_days',
    ]);
  }
}
