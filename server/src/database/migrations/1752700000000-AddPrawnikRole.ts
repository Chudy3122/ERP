import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrawnikRole1752700000000 implements MigrationInterface {
  name = 'AddPrawnikRole1752700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users.role is a varchar guarded by a CHECK constraint — widen it to allow 'prawnik'.
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`);
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('admin','kierownik','employee','ksiegowosc','kadry','szef','sekretariat','prawnik')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`);
    await queryRunner.query(`
      ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (
        role IN ('admin','kierownik','employee','ksiegowosc','kadry','szef','sekretariat')
      )
    `);
  }
}
