import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeChannelNameNullable1738200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make channel name nullable (for direct message channels)
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "name" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: make name required again
    await queryRunner.query(`ALTER TABLE "channels" ALTER COLUMN "name" SET NOT NULL`);
  }
}
