import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcedureAttachments1748600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.hasTable('procedures');
    if (!table) return;
    const hasColumn = await queryRunner.hasColumn('procedures', 'attachments');
    if (!hasColumn) {
      await queryRunner.query(`ALTER TABLE "procedures" ADD COLUMN "attachments" jsonb NOT NULL DEFAULT '[]'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "procedures" DROP COLUMN IF EXISTS "attachments"`);
  }
}
