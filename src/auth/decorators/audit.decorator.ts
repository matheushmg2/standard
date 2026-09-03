// src/auth/decorators/audit.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../../logs/entities/audit-log.entity';

export const AUDIT_ACTION_KEY = 'auditAction';
export const Audit = (action: AuditAction) => SetMetadata(AUDIT_ACTION_KEY, action);