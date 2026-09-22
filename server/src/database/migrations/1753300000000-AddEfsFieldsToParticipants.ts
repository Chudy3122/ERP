import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEfsFieldsToParticipants1753300000000 implements MigrationInterface {
  name = 'AddEfsFieldsToParticipants1753300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = 'crm_project_participants';
    const cols = [
      `"pesel" varchar(64)`,
      `"gender" varchar(32)`,
      `"age" int`,
      `"education" varchar(255)`,
      `"city" varchar(255)`,
      `"postal_code" varchar(20)`,
      `"labour_status" varchar(255)`,
      `"start_date" date`,
      `"end_date" date`,
      `"extra_data" text`,
    ];
    for (const col of cols) {
      await queryRunner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS ${col}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = 'crm_project_participants';
    for (const c of ['pesel', 'gender', 'age', 'education', 'city', 'postal_code', 'labour_status', 'start_date', 'end_date', 'extra_data']) {
      await queryRunner.query(`ALTER TABLE "${t}" DROP COLUMN IF EXISTS "${c}"`);
    }
  }
}
