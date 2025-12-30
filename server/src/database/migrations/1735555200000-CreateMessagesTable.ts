import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateMessagesTable1735555200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'channel_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'sender_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'message_type',
            type: 'varchar',
            length: '20',
            default: "'text'",
          },
          {
            name: 'parent_message_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'is_edited',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
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
      }),
      true
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['channel_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'channels',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['sender_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'messages',
      new TableForeignKey({
        columnNames: ['parent_message_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'messages',
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_channel',
        columnNames: ['channel_id'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_sender',
        columnNames: ['sender_id'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_created_at',
        columnNames: ['created_at'],
      })
    );

    await queryRunner.createIndex(
      'messages',
      new TableIndex({
        name: 'idx_messages_parent',
        columnNames: ['parent_message_id'],
      })
    );

    // Check constraint for message_type
    await queryRunner.query(`
      ALTER TABLE messages ADD CONSTRAINT chk_messages_type
      CHECK (message_type IN ('text', 'file', 'system'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('messages');
  }
}
