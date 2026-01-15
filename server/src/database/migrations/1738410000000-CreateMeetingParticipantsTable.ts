import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMeetingParticipantsTable1738410000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'meeting_participants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'meeting_id',
            type: 'uuid',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['invited', 'accepted', 'rejected', 'in_call'],
            default: "'invited'",
          },
          {
            name: 'joined_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'left_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      'meeting_participants',
      new TableForeignKey({
        columnNames: ['meeting_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'meetings',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'meeting_participants',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('meeting_participants');
    if (table) {
      const meetingFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('meeting_id') !== -1
      );
      if (meetingFk) {
        await queryRunner.dropForeignKey('meeting_participants', meetingFk);
      }

      const userFk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('user_id') !== -1
      );
      if (userFk) {
        await queryRunner.dropForeignKey('meeting_participants', userFk);
      }
    }
    await queryRunner.dropTable('meeting_participants');
  }
}
