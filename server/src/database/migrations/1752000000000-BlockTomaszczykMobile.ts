import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlockTomaszczykMobile1752000000000 implements MigrationInterface {
  name = 'BlockTomaszczykMobile1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Andrzej Tomaszczyk may log in only from a computer
    await queryRunner.query(
      `UPDATE users SET desktop_only = true WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET desktop_only = false WHERE lower(email) = 'andrzej.tomaszczyk@itcomplete.pl'`
    );
  }
}
