import { MigrationInterface, QueryRunner } from 'typeorm';

// Notifications type column is stored as VARCHAR, not as a PostgreSQL enum type.
// New CRM notification types (deal_assigned, deal_stage_changed, deal_won, deal_follow_up)
// are defined in the TypeScript NotificationType enum in Notification.model.ts - no DB change needed.
export class AddCrmNotificationTypes1739200004000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // No-op: notification type is stored as varchar, not a PostgreSQL enum
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
