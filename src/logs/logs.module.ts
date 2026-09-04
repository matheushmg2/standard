// src/logs/logs.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { LogsController } from './logs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])], // ← Registrar a entidade aqui
  providers: [AuditLogService],
  controllers: [LogsController],
  exports: [AuditLogService],
})
export class LogsModule {}