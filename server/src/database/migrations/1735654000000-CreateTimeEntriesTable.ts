import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateTimeEntriesTable1735654000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'time_entries',
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
            name: 'clock_in',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'clock_out',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_overtime',
            type: 'boolean',
            default: false,
          },
          {
            name: 'overtime_minutes',
            type: 'integer',
            default: 0,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'in_progress'",
          },
          {
            name: 'approved_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
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

    // Foreign key for user_id
    await queryRunner.createForeignKey(
      'time_entries',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Foreign key for approved_by
    await queryRunner.createForeignKey(
      'time_entries',
      new TableForeignKey({
        columnNames: ['approved_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.query(
      `CREATE INDEX idx_time_entries_user_id ON time_entries(user_id)`
    );
    await queryRunner.query(
      `CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in)`
    );
    await queryRunner.query(
      `CREATE INDEX idx_time_entries_status ON time_entries(status)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('time_entries');
  }
}
