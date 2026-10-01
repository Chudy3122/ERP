import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correction: Marcin Stachyra leaves "BUR / Handel / Energetyka" and becomes the
 * head of Projekty Inwestycyjne (reverting the combined-dept head choice from the
 * previous migration). The combined dept is left without a head unless one is set
 * later in the panel.
 */
export class MarcinHeadsProjektyInwestycyjne1753500000000 implements MigrationInterface {
  name = 'MarcinHeadsProjektyInwestycyjne1753500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const marcin = `(SELECT id FROM users WHERE lower(trim(first_name)) = 'marcin' AND lower(trim(last_name)) = 'stachyra' LIMIT 1)`;

    // Move Marcin into Projekty Inwestycyjne.
    await queryRunner.query(`
      UPDATE users
         SET department_id = (SELECT id FROM departments WHERE code = 'PI'),
             department = (SELECT name FROM departments WHERE code = 'PI')
       WHERE lower(trim(first_name)) = 'marcin' AND lower(trim(last_name)) = 'stachyra'
         AND EXISTS (SELECT 1 FROM departments WHERE code = 'PI')
    `);

    // Make him head of Projekty Inwestycyjne.
    await queryRunner.query(`UPDATE departments SET head_id = ${marcin} WHERE code = 'PI'`);

    // Drop him as head of the combined BUR dept (no head specified for it now).
    await queryRunner.query(`UPDATE departments SET head_id = NULL WHERE code = 'BUR' AND head_id = ${marcin}`);
  }

  public async down(): Promise<void> {
    // One-way org data correction — no automatic rollback.
  }
}
