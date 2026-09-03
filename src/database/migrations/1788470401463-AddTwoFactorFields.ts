import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddTwoFactorFields1788470401463 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Adicionar coluna twoFactorSecret
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorSecret',
                type: 'varchar',
                length: '255',
                isNullable: true,
            }),
        );

        // Adicionar coluna twoFactorEnabled
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorEnabled',
                type: 'boolean',
                default: false,
                isNullable: false,
            }),
        );

        // Adicionar coluna twoFactorBackupCodes como jsonb
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'twoFactorBackupCodes',
                type: 'jsonb',
                isNullable: true,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('users', 'twoFactorBackupCodes');
        await queryRunner.dropColumn('users', 'twoFactorEnabled');
        await queryRunner.dropColumn('users', 'twoFactorSecret');
    }
}