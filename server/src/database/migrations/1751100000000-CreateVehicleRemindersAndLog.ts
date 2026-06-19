import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVehicleRemindersAndLog1751100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (exists) {
      await queryRunner.query(`ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'vehicle_reminder'`);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_reminders (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        title varchar(150) NOT NULL,
        due_date date NOT NULL,
        remind_days_before integer NOT NULL DEFAULT 14,
        notes text,
        reminded_at timestamp,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_reminders_vehicle ON vehicle_reminders(vehicle_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_reminders_due ON vehicle_reminders(due_date)`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_log_entries (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        entry_date date NOT NULL,
        title varchar(200) NOT NULL,
        category varchar(20) NOT NULL DEFAULT 'repair',
        cost numeric(10,2),
        mileage integer,
        notes text,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_log_vehicle ON vehicle_log_entries(vehicle_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_log_entries`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_reminders`);
  }
}
