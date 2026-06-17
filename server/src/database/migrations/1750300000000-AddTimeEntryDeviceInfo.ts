import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimeEntryDeviceInfo1750300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_entries
        ADD COLUMN IF NOT EXISTS clock_in_device varchar(20),
        ADD COLUMN IF NOT EXISTS clock_in_ip varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE time_entries
        DROP COLUMN IF EXISTS clock_in_device,
        DROP COLUMN IF EXISTS clock_in_ip
    `);
  }
}
