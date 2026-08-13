import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Org-structure corrections:
 *  1. Delete the "Dział podwykonawstwa" department (mirrors the app's own
 *     delete: reparent children, unassign its employees, then drop it).
 *  2. Put Energetyka under Zarząd — reuse BUR's parent, which already is Zarząd.
 *  3. Make Marcin Stachyra head of Dział Projektów Inwestycyjnych (PI) — reuse
 *     BUR's head, which is Marcin Stachyra, so we don't hard-code a user id.
 */
export class OrgStructureTweaks1753000000000 implements MigrationInterface {
  name = 'OrgStructureTweaks1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---- 1. Remove "Dział podwykonawstwa" ----
    // Reparent any children to its parent (keep the tree intact).
    await queryRunner.query(`
      UPDATE departments
      SET parent_id = (SELECT parent_id FROM departments WHERE name ILIKE 'Dział podwykonawstwa%' LIMIT 1)
      WHERE parent_id = (SELECT id FROM departments WHERE name ILIKE 'Dział podwykonawstwa%' LIMIT 1)
    `);
    // Unassign its employees (the only FK to departments.id).
    await queryRunner.query(`
      UPDATE users
      SET department_id = NULL, department = NULL
      WHERE department_id = (SELECT id FROM departments WHERE name ILIKE 'Dział podwykonawstwa%' LIMIT 1)
    `);
    // Drop the department.
    await queryRunner.query(`DELETE FROM departments WHERE name ILIKE 'Dział podwykonawstwa%'`);

    // ---- 2. Energetyka under Zarząd (same parent as BUR) ----
    await queryRunner.query(`
      UPDATE departments
      SET parent_id = (SELECT parent_id FROM departments WHERE code = 'BUR')
      WHERE code = 'ENE'
    `);

    // ---- 3. Marcin Stachyra heads Dział Projektów Inwestycyjnych (same head as BUR) ----
    await queryRunner.query(`
      UPDATE departments
      SET head_id = (SELECT head_id FROM departments WHERE code = 'BUR')
      WHERE code = 'PI'
    `);
  }

  public async down(): Promise<void> {
    // Data correction — the deleted department cannot be reliably restored, so
    // this is intentionally a no-op.
  }
}
