// src/common/interceptors/audit.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../../logs/audit-log.service';
import { AuditAction } from '../../logs/entities/audit-log.entity';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditLogService: AuditLogService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Pular se não tiver ação definida
    const action = this.reflector.get<AuditAction>(
      'auditAction',
      handler,
    );

    if (!action) {
      return next.handle();
    }

    const userId = request.user?.userId || request.user?.id;
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap({
        next: (data) => {
          this.auditLogService.log(
            userId,
            action,
            {
              method,
              url,
              statusCode: context.switchToHttp().getResponse().statusCode,
            },
            request,
            `Ação ${action} executada`,
          );
        },
        error: (error) => {
          this.auditLogService.log(
            userId,
            action,
            {
              method,
              url,
              error: error.message,
              statusCode: error.status,
            },
            request,
            `Ação ${action} falhou: ${error.message}`,
          );
        },
      }),
    );
  }
}