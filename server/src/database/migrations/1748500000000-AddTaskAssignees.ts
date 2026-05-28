import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTaskAssignees1748500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_assignees" (
        "task_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_task_assignees" PRIMARY KEY ("task_id", "user_id"),
        CONSTRAINT "FK_task_assignees_task" FOREIGN KEY ("task_id")
          REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_task_assignees_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_task_assignees_task_id" ON "task_assignees" ("task_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_task_assignees_user_id" ON "task_assignees" ("user_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "task_assignees"`);
  }
}
