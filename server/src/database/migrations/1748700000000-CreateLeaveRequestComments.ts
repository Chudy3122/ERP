import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeaveRequestComments1748700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const exists = await queryRunner.hasTable('leave_request_comments');
    if (exists) return;
    await queryRunner.query(`
      CREATE TABLE "leave_request_comments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "leave_request_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_leave_request_comments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_lrc_leave_request" FOREIGN KEY ("leave_request_id")
          REFERENCES "leave_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_lrc_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_lrc_leave_request_id" ON "leave_request_comments" ("leave_request_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_request_comments"`);
  }
}
