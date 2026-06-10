import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScheduledMeetingRingSentAt1749600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Marks that the "meeting is starting" ring/notification has already been sent
    await queryRunner.query(`
      ALTER TABLE "scheduled_meetings"
      ADD COLUMN IF NOT EXISTS "ring_sent_at" timestamp
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "scheduled_meetings" DROP COLUMN IF EXISTS "ring_sent_at"`);
  }
}
