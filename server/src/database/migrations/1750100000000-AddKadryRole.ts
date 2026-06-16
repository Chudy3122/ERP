import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Split the old "księgowość" role into two:
 *  - existing księgowość people become "kadry" (full HR access — unchanged powers),
 *  - "ksiegowosc" stays as a new, limited role (finance + activity only).
 */
export class AddKadryRole1750100000000 implements MigrationInterface {
  name = 'AddKadryRole1750100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`);
    // Current księgowość users keep their full access under the new "kadry" role
    await queryRunner.query(`UPDATE "users" SET "role" = 'kadry' WHERE "role" = 'ksiegowosc'`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "chk_users_role"
      CHECK (role IN ('admin', 'kierownik', 'employee', 'ksiegowosc', 'kadry', 'szef', 'sekretariat'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'ksiegowosc' WHERE "role" = 'kadry'`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "chk_users_role"
      CHECK (role IN ('admin', 'kierownik', 'employee', 'ksiegowosc', 'szef', 'sekretariat'))
    `);
  }
}
