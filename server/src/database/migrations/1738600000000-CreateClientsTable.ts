import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateClientsTable1738600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for client type
    await queryRunner.query(`
      CREATE TYPE client_type_enum AS ENUM ('client', 'supplier', 'both')
    `);

    await queryRunner.createTable(
      new Table({
        name: 'clients',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'nip',
            type: 'varchar',
            length: '20',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'regon',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'street',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'city',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'postal_code',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'country',
            type: 'varchar',
            length: '100',
            default: "'Polska'",
          },
          {
            name: 'contact_person',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'client_type',
            type: 'client_type_enum',
            default: "'client'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );

    // Foreign key to users for creator
    await queryRunner.createForeignKey(
      'clients',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      })
    );

    // Indexes
    await queryRunner.createIndex(
      'clients',
      new TableIndex({
        name: 'IDX_clients_name',
        columnNames: ['name'],
      })
    );

    await queryRunner.createIndex(
      'clients',
      new TableIndex({
        name: 'IDX_clients_nip',
        columnNames: ['nip'],
      })
    );

    await queryRunner.createIndex(
      'clients',
      new TableIndex({
        name: 'IDX_clients_client_type',
        columnNames: ['client_type'],
      })
    );

    await queryRunner.createIndex(
      'clients',
      new TableIndex({
        name: 'IDX_clients_is_active',
        columnNames: ['is_active'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('clients');
    await queryRunner.query(`DROP TYPE client_type_enum`);
  }
}
