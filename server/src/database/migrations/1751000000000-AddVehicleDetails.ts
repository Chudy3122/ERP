import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVehicleDetails1751000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vehicles
        ADD COLUMN IF NOT EXISTS year integer,
        ADD COLUMN IF NOT EXISTS seats integer,
        ADD COLUMN IF NOT EXISTS fuel_type varchar(30),
        ADD COLUMN IF NOT EXISTS notes text,
        ADD COLUMN IF NOT EXISTS image_url text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE vehicles
        DROP COLUMN IF EXISTS year,
        DROP COLUMN IF EXISTS seats,
        DROP COLUMN IF EXISTS fuel_type,
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS image_url
    `);
  }
}
