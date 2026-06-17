import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupplyCommentsTable1750610000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supply_comments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        request_id uuid NOT NULL REFERENCES supply_requests(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_supply_comments_request ON supply_comments(request_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS supply_comments`);
  }
}
