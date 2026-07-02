import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGameScores1752400000000 implements MigrationInterface {
  name = 'CreateGameScores1752400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS game_scores (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        game varchar(40) NOT NULL,
        score integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uq_game_scores_user_game UNIQUE (user_id, game)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_game_scores_game_score ON game_scores(game, score DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS game_scores`);
  }
}
