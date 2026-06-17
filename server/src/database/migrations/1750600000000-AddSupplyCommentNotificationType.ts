import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupplyCommentNotificationType1750600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists }] = await queryRunner.query(
      `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') AS exists`
    );
    if (!exists) return;

    await queryRunner.query(`
      ALTER TYPE notifications_type_enum ADD VALUE IF NOT EXISTS 'supply_request_comment';
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values — no-op
  }
}
