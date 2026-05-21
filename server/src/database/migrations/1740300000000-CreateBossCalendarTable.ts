import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBossCalendarTable1740300000000 implements MigrationInterface {
  name = 'CreateBossCalendarTable1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "boss_calendar_entry_type_enum" AS ENUM ('meeting', 'available', 'blocked')
    `);

    await queryRunner.query(`
      CREATE TABLE "boss_calendar" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "date" date NOT NULL,
        "start_time" varchar(5) NOT NULL,
        "end_time" varchar(5) NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "type" "boss_calendar_entry_type_enum" NOT NULL DEFAULT 'meeting',
        "location" varchar(255),
        "created_by" uuid NOT NULL,
        "updated_by" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_boss_calendar" PRIMARY KEY ("id"),
        CONSTRAINT "FK_boss_calendar_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_boss_calendar_date" ON "boss_calendar" ("date")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_boss_calendar_date"`);
    await queryRunner.query(`DROP TABLE "boss_calendar"`);
    await queryRunner.query(`DROP TYPE "boss_calendar_entry_type_enum"`);
  }
}
