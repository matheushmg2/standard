
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { QueryFailedError } from 'typeorm';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger: Logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: any = null;

    
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;

      if (driverError?.code === '22001') {
        
        status = HttpStatus.BAD_REQUEST;
        message = 'Valor muito longo para o campo';
        errors = this.extractFieldError(exception);
      } else if (driverError?.code === '23505') {
        
        status = HttpStatus.CONFLICT;
        message = 'Registro duplicado';
        errors = this.extractDuplicateError(exception);
      }
    }

    
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      status = exception.getStatus();

      if (typeof response === 'object' && response !== null) {
        message = (response as any).message || message;
        errors = (response as any).errors || null;
      }
    }

    
    this.logger.error('❌ Erro capturado:', {
      status,
      message,
      errors,
      exception: exception instanceof Error ? exception.message : exception,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    
    response.status(status).send({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }

  private extractFieldError(exception: QueryFailedError): any {
    const match = (exception as any).query?.match(/columns?\s+"(\w+)"/i);
    if (match) {
      return { field: match[1], message: 'Valor muito longo para este campo' };
    }
    return null;
  }

  private extractDuplicateError(exception: QueryFailedError): any {
    const match = (exception as any).query?.match(/Key\s+\((\w+)\)/);
    if (match) {
      return { field: match[1], message: 'Este valor já está em uso' };
    }
    return null;
  }
}
