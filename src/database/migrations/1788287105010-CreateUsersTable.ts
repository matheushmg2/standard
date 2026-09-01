import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1788287105010 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Habilitar extensão UUID
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'email',
                        type: 'varchar',
                        length: '255',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'password',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'refreshToken',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'role',
                        type: 'enum',
                        enum: ['user', 'admin', 'moderator', 'super_admin'],
                        default: "'user'",
                        isNullable: false,
                    },
                    {
                        name: 'isEmailVerified',
                        type: 'boolean',
                        default: false,
                        isNullable: false,
                    },
                    {
                        name: 'emailVerificationToken',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'emailVerificationTokenExpires',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'passwordResetToken',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'passwordResetTokenExpires',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'loginAttempts',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'lockUntil',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'isActive',
                        type: 'boolean',
                        default: true,
                        isNullable: false,
                    },
                    {
                        name: 'lastLoginAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'lastLoginIP',
                        type: 'varchar',
                        length: '45',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Adicionar índices
        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_EMAIL',
                columnNames: ['email'],
            })
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_VERIFICATION_TOKEN',
                columnNames: ['emailVerificationToken'],
            })
        );

        await queryRunner.createIndex(
            'users',
            new TableIndex({
                name: 'IDX_USERS_RESET_TOKEN',
                columnNames: ['passwordResetToken'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('users', 'IDX_USERS_EMAIL');
        await queryRunner.dropIndex('users', 'IDX_USERS_VERIFICATION_TOKEN');
        await queryRunner.dropIndex('users', 'IDX_USERS_RESET_TOKEN');
        await queryRunner.dropTable('users');
    }
}