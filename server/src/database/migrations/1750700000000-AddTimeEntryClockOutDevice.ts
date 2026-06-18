import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimeEntryClockOutDevice1750700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_entries
        ADD COLUMN IF NOT EXISTS clock_out_device varchar(20),
        ADD COLUMN IF NOT EXISTS clock_out_ip varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_entries
        DROP COLUMN IF EXISTS clock_out_device,
        DROP COLUMN IF EXISTS clock_out_ip
    `);
  }
}
