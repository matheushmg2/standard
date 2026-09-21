// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const elapsed = Date.now() - startTime;

          this.logger.infoWithMetadata(
            'HTTP',
            `${method} ${url} ${statusCode} - ${elapsed}ms`,
            {
              method,
              url,
              statusCode,
              elapsed,
              ip,
              userAgent,
            }
          );
        },
        error: (error) => {
          const elapsed = Date.now() - startTime;
          this.logger.errorWithMetadata(
            'HTTP',
            `${method} ${url} ${error.status || 500} - ${elapsed}ms`,
            {
              method,
              url,
              statusCode: error.status || 500,
              elapsed,
              ip,
              userAgent,
              error: error.message,
            }
          );
        },
      })
    );
  }
}