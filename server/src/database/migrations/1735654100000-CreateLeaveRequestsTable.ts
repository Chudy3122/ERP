import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLeaveRequestsTable1735654100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'leave_requests',
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
            name: 'leave_type',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'total_days',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
          },
          {
            name: 'reviewed_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'reviewed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'review_notes',
            type: 'text',
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
      'leave_requests',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      })
    );

    // Foreign key for reviewed_by
    await queryRunner.createForeignKey(
      'leave_requests',
      new TableForeignKey({
        columnNames: ['reviewed_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.query(
      `CREATE INDEX idx_leave_requests_user_id ON leave_requests(user_id)`
    );
    await queryRunner.query(
      `CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date)`
    );
    await queryRunner.query(
      `CREATE INDEX idx_leave_requests_status ON leave_requests(status)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('leave_requests');
  }
}
