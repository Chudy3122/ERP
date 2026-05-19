import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProceduresTable1740100000000 implements MigrationInterface {
  name = 'CreateProceduresTable1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "procedure_status_enum" AS ENUM ('draft', 'active', 'archived')
    `);

    await queryRunner.query(`
      CREATE TABLE "procedures" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar(255) NOT NULL,
        "description" text,
        "content" text NOT NULL,
        "category" varchar(100),
        "status" "procedure_status_enum" NOT NULL DEFAULT 'draft',
        "version" varchar(20) NOT NULL DEFAULT '1.0',
        "created_by" uuid NOT NULL,
        "updated_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_procedures" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procedures_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION,
        CONSTRAINT "FK_procedures_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_procedures_status" ON "procedures" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_procedures_category" ON "procedures" ("category")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_procedures_category"`);
    await queryRunner.query(`DROP INDEX "IDX_procedures_status"`);
    await queryRunner.query(`DROP TABLE "procedures"`);
    await queryRunner.query(`DROP TYPE "procedure_status_enum"`);
  }
}
