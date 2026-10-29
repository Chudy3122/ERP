import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRemoteSupport1753700000000 implements MigrationInterface {
  name = 'CreateRemoteSupport1753700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "remote_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "label" varchar(120) NOT NULL DEFAULT 'Komputer',
        "rustdesk_id" varchar(64) NOT NULL,
        "access_password" varchar(255),
        "notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remote_devices" PRIMARY KEY ("id"),
        CONSTRAINT "FK_remote_devices_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_remote_devices_user" ON "remote_devices" ("user_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "remote_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "requester_id" uuid,
        "helper_id" uuid,
        "device_id" uuid,
        "ticket_id" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'requested',
        "reason" text,
        "resolution_note" text,
        "started_at" TIMESTAMP,
        "ended_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_remote_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_remote_sessions_requester" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_remote_sessions_helper" FOREIGN KEY ("helper_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_remote_sessions_device" FOREIGN KEY ("device_id") REFERENCES "remote_devices"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_remote_sessions_status" ON "remote_sessions" ("status")`);

    // Notification enum value (if the enum exists yet).
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`,
    );
    if (exists) {
      await queryRunner.query(`ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'remote_support_request'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "remote_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "remote_devices"`);
  }
}
