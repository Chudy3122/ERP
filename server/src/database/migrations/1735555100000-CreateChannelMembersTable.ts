import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateChannelMembersTable1735555100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'channel_members',
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
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            default: "'member'",
          },
          {
            name: 'joined_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'last_read_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'channel_members',
      new TableForeignKey({
        columnNames: ['channel_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'channels',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'channel_members',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'channel_members',
      new TableIndex({
        name: 'idx_channel_members_channel',
        columnNames: ['channel_id'],
      })
    );

    await queryRunner.createIndex(
      'channel_members',
      new TableIndex({
        name: 'idx_channel_members_user',
        columnNames: ['user_id'],
      })
    );

    // Unique constraint
    await queryRunner.createIndex(
      'channel_members',
      new TableIndex({
        name: 'idx_channel_members_unique',
        columnNames: ['channel_id', 'user_id'],
        isUnique: true,
      })
    );

    // Check constraint for role
    await queryRunner.query(`
      ALTER TABLE channel_members ADD CONSTRAINT chk_channel_members_role
      CHECK (role IN ('admin', 'member'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('channel_members');
  }
}
