// src/logs/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, LessThan, In } from 'typeorm';
import { FastifyRequest } from 'fastify'; // ← Importar FastifyRequest

import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | undefined,
    action: AuditAction,
    metadata: Record<string, any> = {},
    req?: FastifyRequest,
    description?: string,
  ): Promise<AuditLog> {
    const ip = req?.ip || 
               (req?.raw?.connection?.remoteAddress) || 
               (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim();

    const log = this.auditLogRepository.create({
      userId,
      action,
      metadata,
      description,
      ipAddress: ip,
      userAgent: req?.headers?.['user-agent'] as string,
    });

    return this.auditLogRepository.save(log);
  }

  async getUserLogs(
    userId: string,
    options: {
      action?: AuditAction;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const { action, startDate, endDate, limit = 50, offset = 0 } = options;

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId });

    if (action) {
      query.andWhere('log.action = :action', { action });
    }

    if (startDate) {
      query.andWhere('log.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const [logs, total] = await query
      .orderBy('log.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

  async getUserActivitySummary(userId: string, days: number = 30): Promise<any> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const logs = await this.auditLogRepository.find({
      where: {
        userId,
        createdAt: MoreThan(date),
      },
      order: { createdAt: 'DESC' },
    });

    // Agrupar por ação
    const summary = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: logs.length,
      period: `${days} dias`,
      actions: summary,
      lastLogin: logs.find((l) => l.action === AuditAction.LOGIN)?.createdAt,
      lastActivity: logs[0]?.createdAt,
    };
  }

  async getSuspiciousActivities(
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<AuditLog[]> {
  const { limit = 100, offset = 0 } = options;

  const suspiciousActions = [
    AuditAction.LOGIN_FAILED,
    AuditAction.THREAT_DETECTED,
    AuditAction.SUSPICIOUS_ACTIVITY,
  ];

  return this.auditLogRepository.find({
    where: { action: In(suspiciousActions) },
    order: { createdAt: 'DESC' },
    skip: offset,
    take: limit,
    // relations: ['user'], // ← REMOVER esta linha
  });
}

  async getLoginAttempts(
    userId: string,
    days: number = 7,
  ): Promise<{ success: number; failed: number; attempts: AuditLog[] }> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const logs = await this.auditLogRepository.find({
      where: {
        userId,
        action: In([AuditAction.LOGIN, AuditAction.LOGIN_FAILED]),
        createdAt: MoreThan(date),
      },
      order: { createdAt: 'DESC' },
    });

    const success = logs.filter((l) => l.action === AuditAction.LOGIN).length;
    const failed = logs.filter((l) => l.action === AuditAction.LOGIN_FAILED).length;

    return { success, failed, attempts: logs };
  }

  async cleanupOldLogs(days: number = 90): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(date),
    });

    return result.affected || 0;
  }
}