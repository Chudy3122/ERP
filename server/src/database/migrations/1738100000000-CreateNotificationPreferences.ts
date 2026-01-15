import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateNotificationPreferences1738100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification_preferences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'sound_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sound_type',
            type: 'varchar',
            length: '50',
            default: "'default'",
          },
          {
            name: 'sound_volume',
            type: 'integer',
            default: 50,
          },
          {
            name: 'desktop_notifications',
            type: 'boolean',
            default: true,
          },
          {
            name: 'show_preview',
            type: 'boolean',
            default: true,
          },
          {
            name: 'badge_count',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notify_messages',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notify_mentions',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notify_leave_status',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notify_time_reminders',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notify_system_updates',
            type: 'boolean',
            default: false,
          },
          {
            name: 'dnd_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'dnd_start_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'dnd_end_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            columnNames: ['user_id'],
            isUnique: true,
          },
        ],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_preferences');
  }
}
