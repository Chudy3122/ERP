import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Org restructure (Oct 2026):
 *  - Merge BUR + Handel + Energetyka into one department "BUR / Handel / Energetyka"
 *    (rename BUR, move Energetyka's people in, drop the separate ENE department).
 *    Head: Marcin Stachyra. Members: + Katarzyna Gaworek, + Andrzej Tomaszczyk.
 *  - Izabela Kula -> Sekretariat.
 *  - Krzysztof Dumała -> Księgowość.
 *  - Projekty Inwestycyjne: Milena Pastwa + Radosław Krajewski; drop Marcin as PI head.
 * People are matched by first+last name (and Andrzej also by email) — case/space
 * insensitive. A name that doesn't match simply updates 0 rows (verify in the panel).
 */
export class MergeBurHandelEnergetyka1753400000000 implements MigrationInterface {
  name = 'MergeBurHandelEnergetyka1753400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const COMBINED = `(SELECT id FROM departments WHERE code = 'BUR')`;
    const person = (first: string, last: string) =>
      `lower(trim(first_name)) = '${first}' AND lower(trim(last_name)) = '${last}'`;

    // 1) Rename BUR -> combined name.
    await queryRunner.query(`UPDATE departments SET name = 'BUR / Handel / Energetyka' WHERE code = 'BUR'`);

    // 2) Merge Energetyka: move its people into the combined dept, then drop it.
    await queryRunner.query(`
      UPDATE users SET department_id = ${COMBINED}, department = 'BUR / Handel / Energetyka'
      WHERE department_id = (SELECT id FROM departments WHERE code = 'ENE')
    `);
    await queryRunner.query(`
      UPDATE users SET department_id = ${COMBINED}, department = 'BUR / Handel / Energetyka'
      WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'
    `);
    // reparent any ENE children to its parent (safety), then delete ENE
    await queryRunner.query(`
      UPDATE departments SET parent_id = (SELECT parent_id FROM departments WHERE code = 'ENE')
      WHERE parent_id = (SELECT id FROM departments WHERE code = 'ENE')
    `);
    await queryRunner.query(`DELETE FROM departments WHERE code = 'ENE'`);

    // 3) Katarzyna Gaworek -> combined.
    await queryRunner.query(`
      UPDATE users SET department_id = ${COMBINED}, department = 'BUR / Handel / Energetyka'
      WHERE ${person('katarzyna', 'gaworek')}
    `);

    // 4) Combined head = Marcin Stachyra (and make sure he sits in the combined dept).
    await queryRunner.query(`
      UPDATE users SET department_id = ${COMBINED}, department = 'BUR / Handel / Energetyka'
      WHERE ${person('marcin', 'stachyra')}
    `);
    await queryRunner.query(`
      UPDATE departments SET head_id = (SELECT id FROM users WHERE ${person('marcin', 'stachyra')} LIMIT 1)
      WHERE code = 'BUR'
    `);

    // 5) Izabela Kula -> Sekretariat.
    await queryRunner.query(`
      UPDATE users
         SET department_id = (SELECT id FROM departments WHERE name ILIKE 'Sekretariat%' LIMIT 1),
             department = (SELECT name FROM departments WHERE name ILIKE 'Sekretariat%' LIMIT 1)
      WHERE ${person('izabela', 'kula')}
        AND EXISTS (SELECT 1 FROM departments WHERE name ILIKE 'Sekretariat%')
    `);

    // 6) Krzysztof Dumała -> Księgowość.
    await queryRunner.query(`
      UPDATE users
         SET department_id = (SELECT id FROM departments WHERE name ILIKE '%ięgow%' LIMIT 1),
             department = (SELECT name FROM departments WHERE name ILIKE '%ięgow%' LIMIT 1)
      WHERE ${person('krzysztof', 'dumała')}
        AND EXISTS (SELECT 1 FROM departments WHERE name ILIKE '%ięgow%')
    `);

    // 7) Projekty Inwestycyjne: Milena Pastwa + Radosław Krajewski.
    await queryRunner.query(`
      UPDATE users
         SET department_id = (SELECT id FROM departments WHERE code = 'PI'),
             department = (SELECT name FROM departments WHERE code = 'PI')
      WHERE (${person('milena', 'pastwa')} OR ${person('radosław', 'krajewski')})
        AND EXISTS (SELECT 1 FROM departments WHERE code = 'PI')
    `);
    // Marcin no longer heads PI (he heads the combined dept now).
    await queryRunner.query(`
      UPDATE departments SET head_id = NULL
      WHERE code = 'PI' AND head_id = (SELECT id FROM users WHERE ${person('marcin', 'stachyra')} LIMIT 1)
    `);
  }

  public async down(): Promise<void> {
    // One-way org data correction — no automatic rollback.
  }
}
