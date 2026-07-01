import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageReactions1752300000000 implements MigrationInterface {
  name = 'CreateMessageReactions1752300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji varchar(16) NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_message_reactions_msg_user UNIQUE (message_id, user_id)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS message_reactions`);
  }
}
