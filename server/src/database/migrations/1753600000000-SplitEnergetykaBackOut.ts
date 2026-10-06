import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Org correction: un-merge Energetyka from the combined department.
 *  - Rename "BUR / Handel / Energetyka" -> "BUR / Handel".
 *  - Head of BUR = Katarzyna Gaworek (Ewelina Pcion stays as a member).
 *  - Recreate the Energetyka department (under Zarząd) and move Andrzej
 *    Tomaszczyk into it, on his own (no head).
 */
export class SplitEnergetykaBackOut1753600000000 implements MigrationInterface {
  name = 'SplitEnergetykaBackOut1753600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Rename combined dept.
    await queryRunner.query(`UPDATE departments SET name = 'BUR / Handel' WHERE code = 'BUR'`);

    // 2) Head of BUR = Katarzyna Gaworek.
    await queryRunner.query(`
      UPDATE departments
         SET head_id = (SELECT id FROM users
                          WHERE lower(trim(first_name)) = 'katarzyna' AND lower(trim(last_name)) = 'gaworek' LIMIT 1)
       WHERE code = 'BUR'
    `);

    // 3) Recreate Energetyka under the same parent as BUR (Zarząd).
    await queryRunner.query(`
      INSERT INTO departments (name, code, color, is_active, parent_id, created_at, updated_at)
      VALUES ('Energetyka', 'ENE', '#F59E0B', true, (SELECT parent_id FROM departments WHERE code = 'BUR'), now(), now())
      ON CONFLICT (code) DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE departments SET parent_id = (SELECT parent_id FROM departments WHERE code = 'BUR') WHERE code = 'ENE'
    `);

    // 4) Andrzej Tomaszczyk -> Energetyka (alone).
    await queryRunner.query(`
      UPDATE users SET department_id = (SELECT id FROM departments WHERE code = 'ENE'), department = 'Energetyka'
      WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'
    `);
  }

  public async down(): Promise<void> {
    // One-way org data correction — no automatic rollback.
  }
}
