import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectAndTicketNotificationTypes1750200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // If the enum doesn't exist yet, the notifications table hasn't been created.
    // TypeORM will create it using the current model (which already includes these values).
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (!exists) return;

    await queryRunner.query(`
      ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'project_assigned';
    `);
    await queryRunner.query(`
      ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'ticket_new';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values — no-op
  }
}
