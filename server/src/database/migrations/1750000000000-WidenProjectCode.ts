import { MigrationInterface, QueryRunner } from 'typeorm';

export class WidenProjectCode1750000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Project code: 20 → 30 chars (some codes were too long)
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "code" TYPE varchar(30)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "code" TYPE varchar(20)`);
  }
}
