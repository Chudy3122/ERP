import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLateArrivalFields1738000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_late column
    await queryRunner.addColumn(
      'time_entries',
      new TableColumn({
        name: 'is_late',
        type: 'boolean',
        default: false,
      })
    );

    // Add late_minutes column
    await queryRunner.addColumn(
      'time_entries',
      new TableColumn({
        name: 'late_minutes',
        type: 'integer',
        default: 0,
      })
    );

    // Add expected_clock_in column
    await queryRunner.addColumn(
      'time_entries',
      new TableColumn({
        name: 'expected_clock_in',
        type: 'time',
        isNullable: true,
      })
    );

    // Create index on is_late for filtering
    await queryRunner.query(
      `CREATE INDEX idx_time_entries_is_late ON time_entries(is_late)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX idx_time_entries_is_late`);

    // Drop columns
    await queryRunner.dropColumn('time_entries', 'expected_clock_in');
    await queryRunner.dropColumn('time_entries', 'late_minutes');
    await queryRunner.dropColumn('time_entries', 'is_late');
  }
}
