import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableColumn,
} from "typeorm";

export class CreateAuditLogsTable1788467981108 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "audit_logs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "userId",
            type: "uuid",
            isNullable: true,
          },
          {
            name: "action",
            type: "varchar",
            length: "50",
            isNullable: false,
          },
          {
            name: "ipAddress",
            type: "varchar",
            length: "45",
            isNullable: true,
          },
          {
            name: "userAgent",
            type: "varchar",
            length: "255",
            isNullable: true,
          },

          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.addColumn(
      "audit_logs",
      new TableColumn({
        name: "metadata",
        type: "jsonb",
        isNullable: true,
        default: "'{}'",
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_LOGS_USER_ID",
        columnNames: ["userId"],
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_LOGS_ACTION",
        columnNames: ["action"],
      }),
    );

    await queryRunner.createIndex(
      "audit_logs",
      new TableIndex({
        name: "IDX_AUDIT_LOGS_CREATED_AT",
        columnNames: ["createdAt"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("audit_logs", "IDX_AUDIT_LOGS_CREATED_AT");
    await queryRunner.dropIndex("audit_logs", "IDX_AUDIT_LOGS_ACTION");
    await queryRunner.dropIndex("audit_logs", "IDX_AUDIT_LOGS_USER_ID");
    await queryRunner.dropTable("audit_logs");
  }
}
