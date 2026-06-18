import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFleetModule1750900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Notification types (guarded — enum may not exist yet on a fresh DB).
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (exists) {
      await queryRunner.query(`ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'vehicle_request_new'`);
      await queryRunner.query(`ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'vehicle_request_decision'`);
    }

    // Fleet manager flag + designate Krzysztof Lenart.
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_fleet_manager boolean NOT NULL DEFAULT false`);
    await queryRunner.query(
      `UPDATE users SET is_fleet_manager = true WHERE lower(first_name) = 'krzysztof' AND lower(last_name) = 'lenart'`
    );

    // Vehicles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(100) NOT NULL,
        registration varchar(50),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    // Seed the two current cars (only if not already present by name).
    for (const name of ['Golf 7', 'Hyundai i20']) {
      await queryRunner.query(
        `INSERT INTO vehicles (name) SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM vehicles WHERE name = $1)`,
        [name]
      );
    }

    // Vehicle requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_requests (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        destination varchar(255) NOT NULL,
        purpose text,
        start_at timestamp NOT NULL,
        end_at timestamp NOT NULL,
        passengers integer,
        status varchar(20) NOT NULL DEFAULT 'pending',
        vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
        reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at timestamp,
        review_notes text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_requests_user ON vehicle_requests(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_requests_vehicle ON vehicle_requests(vehicle_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_requests`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicles`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS is_fleet_manager`);
  }
}
