import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSessionsTable1788555249103 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'sessions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'userId', type: 'uuid' },
          { name: 'refreshToken', type: 'varchar', length: '500', isUnique: true },
          { name: 'userAgent', type: 'varchar', length: '255', isNullable: true },
          { name: 'ipAddress', type: 'varchar', length: '45', isNullable: true },
          { name: 'deviceName', type: 'varchar', length: '100', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'expiresAt', type: 'timestamp' },
          { name: 'lastActivityAt', type: 'timestamp' },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('sessions', new TableIndex({ name: 'IDX_SESSIONS_USER', columnNames: ['userId'] }));
    await queryRunner.createIndex('sessions', new TableIndex({ name: 'IDX_SESSIONS_REFRESH_TOKEN', columnNames: ['refreshToken'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sessions');
  }
}