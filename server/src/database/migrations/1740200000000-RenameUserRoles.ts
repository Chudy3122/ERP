import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameUserRoles1740200000000 implements MigrationInterface {
  name = 'RenameUserRoles1740200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old check constraint (allowed only admin, team_leader, employee)
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`);

    // Rename roles in existing records
    await queryRunner.query(`UPDATE "users" SET "role" = 'kierownik' WHERE "role" = 'team_leader'`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'sekretariat' WHERE "role" = 'recepcja'`);

    // Add new constraint with all current roles
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "chk_users_role"
      CHECK (role IN ('admin', 'kierownik', 'employee', 'ksiegowosc', 'szef', 'sekretariat'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_role"`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'team_leader' WHERE "role" = 'kierownik'`);
    await queryRunner.query(`UPDATE "users" SET "role" = 'recepcja' WHERE "role" = 'sekretariat'`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "chk_users_role"
      CHECK (role IN ('admin', 'team_leader', 'employee', 'ksiegowosc', 'szef', 'recepcja'))
    `);
  }
}
