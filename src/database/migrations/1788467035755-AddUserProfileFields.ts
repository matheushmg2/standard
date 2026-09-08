// src/database/migrations/1788467035755-AddUserProfileFields.ts
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserProfileFields1788467035755 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Documentos
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'cpf',
        type: 'varchar',
        length: '14',
        isNullable: true,
        isUnique: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'cnpj',
        type: 'varchar',
        length: '18',
        isNullable: true,
        isUnique: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rg',
        type: 'varchar',
        length: '13',
        isNullable: true,
      })
    );

    // Dados Pessoais
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'birthDate',
        type: 'date',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '20',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'whatsapp',
        type: 'varchar',
        length: '20',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'avatarUrl',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'bio',
        type: 'varchar',
        length: '500',
        isNullable: true,
      })
    );

    // Endereço
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'zipCode',
        type: 'varchar',
        length: '10',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'street',
        type: 'varchar',
        length: '255',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'number',
        type: 'varchar',
        length: '10',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'complement',
        type: 'varchar',
        length: '100',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'neighborhood',
        type: 'varchar',
        length: '100',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        length: '100',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'state',
        type: 'varchar',
        length: '2',
        isNullable: true,
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'country',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'Brasil'",  // ← CORRIGIDO: aspas simples
      })
    );

    // Preferências - CORRIGIDO
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'preferences',
        type: 'jsonb',
        isNullable: true,
        default: "'{}'",  // ← CORRIGIDO: '{}' com aspas simples
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'language',
        type: 'varchar',
        length: '10',
        isNullable: true,
        default: "'pt-BR'",
      })
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'timezone',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'America/Sao_Paulo'",
      })
    );

    // Criar índices
    await queryRunner.query(
      `CREATE INDEX "IDX_USER_CPF" ON "users" ("cpf") WHERE "cpf" IS NOT NULL;`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_USER_CNPJ" ON "users" ("cnpj") WHERE "cnpj" IS NOT NULL;`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_USER_PHONE" ON "users" ("phone") WHERE "phone" IS NOT NULL;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover índices
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CPF";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_CNPJ";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USER_PHONE";`);

    // Remover colunas
    const columns = [
      'timezone',
      'language',
      'preferences',
      'country',
      'state',
      'city',
      'neighborhood',
      'complement',
      'number',
      'street',
      'zipCode',
      'bio',
      'avatarUrl',
      'whatsapp',
      'phone',
      'birthDate',
      'rg',
      'cnpj',
      'cpf',
    ];

    for (const column of columns) {
      await queryRunner.dropColumn('users', column);
    }
  }
}