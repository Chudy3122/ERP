import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnergetykaDepartment1752900000000 implements MigrationInterface {
  name = 'AddEnergetykaDepartment1752900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the Energetyka department (idempotent on its unique code).
    await queryRunner.query(`
      INSERT INTO departments (name, code, color, is_active, created_at, updated_at)
      VALUES ('Energetyka', 'ENE', '#F59E0B', true, now(), now())
      ON CONFLICT (code) DO NOTHING
    `);

    // Move Andrzej Tomaszczyk into it — set both the FK and the legacy label.
    await queryRunner.query(`
      UPDATE users
      SET department_id = (SELECT id FROM departments WHERE code = 'ENE' LIMIT 1),
          department = 'Energetyka'
      WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Detach Andrzej from Energetyka, then drop the department.
    await queryRunner.query(`
      UPDATE users
      SET department_id = NULL, department = NULL
      WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'
        AND department_id = (SELECT id FROM departments WHERE code = 'ENE' LIMIT 1)
    `);
    await queryRunner.query(`DELETE FROM departments WHERE code = 'ENE'`);
  }
}
