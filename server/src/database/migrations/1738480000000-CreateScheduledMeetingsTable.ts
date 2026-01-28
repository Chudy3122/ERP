import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateScheduledMeetingsTable1738480000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type first
    await queryRunner.query(`
      CREATE TYPE meeting_platform_enum AS ENUM (
        'internal',
        'teams',
        'zoom',
        'google_meet'
      )
    `);

    // Create scheduled_meetings table
    await queryRunner.createTable(
      new Table({
        name: 'scheduled_meetings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'platform',
            type: 'meeting_platform_enum',
            default: "'teams'",
          },
          {
            name: 'meeting_link',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'scheduled_date',
            type: 'date',
          },
          {
            name: 'scheduled_time',
            type: 'time',
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            default: 60,
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'participant_ids',
            type: 'text',
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
      }),
      true
    );

    // Add foreign key for created_by
    await queryRunner.createForeignKey(
      'scheduled_meetings',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('scheduled_meetings');
    if (table) {
      const foreignKey = table.foreignKeys.find((fk) => fk.columnNames.indexOf('created_by') !== -1);
      if (foreignKey) {
        await queryRunner.dropForeignKey('scheduled_meetings', foreignKey);
      }
    }

    await queryRunner.dropTable('scheduled_meetings');
    await queryRunner.query('DROP TYPE meeting_platform_enum');
  }
}
