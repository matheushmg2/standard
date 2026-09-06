// src/logs/logs.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Query,
  Param,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditAction } from './entities/audit-log.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FastifyRequest } from 'fastify'; // ← Importar FastifyRequest
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';


@ApiTags('Logs')
@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiCookieAuth()
export class LogsController {
  constructor(private auditLogService: AuditLogService) { }

  @Get('me')
  @ApiOperation({ summary: 'Listar logs do usuário autenticado' })
  @ApiQuery({ name: 'action', enum: AuditAction, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Lista de logs',
    schema: {
      example: {
        logs: [{
          id: '550e8400-e29b-41d4-a716-446655440000',
          action: 'LOGIN',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0...',
          description: 'Login realizado',
          createdAt: '2026-09-04T18:00:00.000Z',
        }],
        total: 10,
      },
    },
  })
  async getMyLogs(
    @Request() req: FastifyRequest & { user: any }, // ← FastifyRequest com user
    @Query('action') action?: AuditAction,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = parseInt(page || '1', 10);
    const limitNumber = parseInt(limit || '20', 10);

    return this.auditLogService.getUserLogs(req.user.userId, {
      action,
      limit: limitNumber,
      offset: (pageNumber - 1) * limitNumber,
    });
  }

  @Get('me/summary')
  @ApiOperation({ summary: 'Resumo de atividades do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Resumo de atividades',
    schema: {
      example: {
        total: 10,
        period: '30 dias',
        actions: { LOGIN: 5, LOGOUT: 3, REGISTER: 1 },
        lastLogin: '2026-09-04T18:00:00.000Z',
        lastActivity: '2026-09-04T18:30:00.000Z',
      },
    },
  })
  async getMyActivitySummary(
    @Request() req: FastifyRequest & { user: any }
  ) {
    return this.auditLogService.getUserActivitySummary(req.user.userId);
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getUserLogs(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = parseInt(page || '1', 10);
    const limitNumber = parseInt(limit || '20', 10);

    return this.auditLogService.getUserLogs(userId, {
      limit: limitNumber,
      offset: (pageNumber - 1) * limitNumber,
    });
  }

  @Get('suspicious')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getSuspiciousActivities(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = parseInt(page || '1', 10);
    const limitNumber = parseInt(limit || '100', 10);

    return this.auditLogService.getSuspiciousActivities({
      limit: limitNumber,
      offset: (pageNumber - 1) * limitNumber,
    });
  }

  @Get('login-attempts/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getLoginAttempts(
    @Param('userId') userId: string,
    @Query('days', ParseIntPipe) days: number = 7,
  ) {
    return this.auditLogService.getLoginAttempts(userId, days);
  }

  @Get('security/audit')
  @Roles(UserRole.SUPER_ADMIN)
  async getSecurityAudit(
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const logs = await this.auditLogService.getSuspiciousActivities({
      limit: 1000,
    });

    return {
      period: `${days} dias`,
      totalSuspicious: logs.length,
      logs: logs.slice(0, 100),
      summary: {
        failedLogins: logs.filter(l => l.action === AuditAction.LOGIN_FAILED).length,
        threats: logs.filter(l => l.action === AuditAction.THREAT_DETECTED).length,
        suspicious: logs.filter(l => l.action === AuditAction.SUSPICIOUS_ACTIVITY).length,
      },
    };
  }
}