import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddWorkTypeToWorkLogs1738470000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type first
    await queryRunner.query(`
      CREATE TYPE work_log_type_enum AS ENUM (
        'regular',
        'unpaid',
        'overtime',
        'overtime_comp',
        'business_trip',
        'late'
      )
    `);

    // Add the column
    await queryRunner.addColumn(
      'work_logs',
      new TableColumn({
        name: 'work_type',
        type: 'work_log_type_enum',
        default: "'regular'",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('work_logs', 'work_type');
    await queryRunner.query('DROP TYPE work_log_type_enum');
  }
}
